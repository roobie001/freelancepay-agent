// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract FreelancePay {
    IERC20 public stablecoin;
    address public owner;
    address public aiAgent;

    enum JobStatus {
        OPEN,
        IN_PROGRESS,
        SUBMITTED,
        APPROVED,
        DISPUTED,
        COMPLETED
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        uint256 budget;
        string title;
        string description;
        JobStatus status;
        uint256 submissionTime;
        bool aiJudgmentMade;
        bool paymentReleased;
        uint256 milestoneCount;
        uint256 currentMilestone;
        uint256 escrowRemaining;
    }

    struct Milestone {
        uint256 amount;
        bool submitted;
        bool approved;
        bool released;
    }

    uint256 public jobCounter;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Milestone[]) private jobMilestones;
    mapping(address => uint256[]) public clientJobs;
    mapping(address => uint256[]) public freelancerJobs;

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        uint256 budget,
        string title
    );
    event JobSubmitted(uint256 indexed jobId, address indexed freelancer);
    event JobDisputed(uint256 indexed jobId);
    event DisputeResolved(uint256 indexed jobId, bool approved);
    event PaymentReleased(uint256 indexed jobId, address indexed freelancer);
    event MilestoneAdded(uint256 indexed jobId, uint256 index, uint256 amount);
    event MilestoneSubmitted(uint256 indexed jobId, uint256 index);
    event MilestoneApproved(uint256 indexed jobId, uint256 index);
    event MilestonePaid(uint256 indexed jobId, uint256 index, uint256 amount);
    event DisputePayout(
        uint256 indexed jobId,
        uint256 freelancerAmount,
        uint256 clientRefund
    );

    constructor(address _stablecoin, address _aiAgent) {
        stablecoin = IERC20(_stablecoin);
        owner = msg.sender;
        aiAgent = _aiAgent;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent allowed");
        _;
    }

    /**
     * @dev Client posts a job and deposits escrow
     */
    function postJob(
        string memory _title,
        string memory _description,
        uint256 _budget
    ) external returns (uint256) {
        require(_budget > 0, "Budget must be greater than 0");
        require(
            stablecoin.transferFrom(msg.sender, address(this), _budget),
            "Transfer failed"
        );

        jobCounter++;
        uint256 jobId = jobCounter;

        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            freelancer: address(0),
            budget: _budget,
            title: _title,
            description: _description,
            status: JobStatus.OPEN,
            submissionTime: 0,
            aiJudgmentMade: false,
            paymentReleased: false,
            milestoneCount: 1,
            currentMilestone: 0,
            escrowRemaining: _budget
        });

        jobMilestones[jobId].push(
            Milestone({
                amount: _budget,
                submitted: false,
                approved: false,
                released: false
            })
        );
        emit MilestoneAdded(jobId, 0, _budget);

        clientJobs[msg.sender].push(jobId);

        emit JobCreated(jobId, msg.sender, _budget, _title);
        return jobId;
    }

    /**
     * @dev Client posts a job with milestones and deposits total escrow
     */
    function postJobWithMilestones(
        string memory _title,
        string memory _description,
        uint256[] memory _milestones
    ) external returns (uint256) {
        require(_milestones.length > 0, "Milestones required");
        uint256 total = 0;
        for (uint256 i = 0; i < _milestones.length; i++) {
            require(_milestones[i] > 0, "Milestone must be > 0");
            total += _milestones[i];
        }
        require(
            stablecoin.transferFrom(msg.sender, address(this), total),
            "Transfer failed"
        );

        jobCounter++;
        uint256 jobId = jobCounter;

        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            freelancer: address(0),
            budget: total,
            title: _title,
            description: _description,
            status: JobStatus.OPEN,
            submissionTime: 0,
            aiJudgmentMade: false,
            paymentReleased: false,
            milestoneCount: _milestones.length,
            currentMilestone: 0,
            escrowRemaining: total
        });

        for (uint256 i = 0; i < _milestones.length; i++) {
            jobMilestones[jobId].push(
                Milestone({
                    amount: _milestones[i],
                    submitted: false,
                    approved: false,
                    released: false
                })
            );
            emit MilestoneAdded(jobId, i, _milestones[i]);
        }

        clientJobs[msg.sender].push(jobId);
        emit JobCreated(jobId, msg.sender, total, _title);
        return jobId;
    }

    /**
     * @dev Freelancer accepts a job
     */
    function acceptJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.OPEN, "Job not available");
        require(job.freelancer == address(0), "Job already accepted");

        job.freelancer = msg.sender;
        job.status = JobStatus.IN_PROGRESS;
        freelancerJobs[msg.sender].push(_jobId);
    }

    /**
     * @dev Freelancer submits work
     */
    function submitWork(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.freelancer == msg.sender, "Not the assigned freelancer");
        require(job.status == JobStatus.IN_PROGRESS, "Job not in progress");

        _submitCurrentMilestone(job);
    }

    /**
     * @dev Freelancer submits work for current milestone
     */
    function submitMilestone(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(job.freelancer == msg.sender, "Not the assigned freelancer");
        require(job.status == JobStatus.IN_PROGRESS, "Job not in progress");

        _submitCurrentMilestone(job);
    }

    function _submitCurrentMilestone(Job storage job) internal {
        uint256 index = job.currentMilestone;
        require(index < job.milestoneCount, "All milestones complete");

        Milestone storage m = jobMilestones[job.id][index];
        require(!m.submitted, "Milestone already submitted");

        m.submitted = true;
        job.status = JobStatus.SUBMITTED;
        job.submissionTime = block.timestamp;
        emit MilestoneSubmitted(job.id, index);
    }

    /**
     * @dev AI agent judges the submission and releases or disputes payment
     */
    function resolveDispute(uint256 _jobId, bool _approved) external onlyAIAgent {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.SUBMITTED, "Invalid job status");

        job.aiJudgmentMade = true;

        if (_approved) {
            job.status = JobStatus.APPROVED;
            _releaseCurrentMilestone(job);
            emit DisputeResolved(_jobId, true);
        } else {
            job.status = JobStatus.DISPUTED;
            emit DisputeResolved(_jobId, false);
        }
    }

    /**
     * @dev AI agent resolves dispute with a payout split (basis points)
     * freelancerBps: 0 - 10000 (10000 = 100%)
     */
    function resolveDisputeWithSplit(uint256 _jobId, uint256 freelancerBps)
        external
        onlyAIAgent
    {
        Job storage job = jobs[_jobId];
        require(
            job.status == JobStatus.SUBMITTED || job.status == JobStatus.DISPUTED,
            "Invalid job status"
        );
        require(!job.paymentReleased, "Payment already released");
        require(job.escrowRemaining > 0, "No escrow remaining");
        require(freelancerBps <= 10000, "Invalid split");

        job.aiJudgmentMade = true;

        uint256 total = job.escrowRemaining;
        uint256 freelancerAmount = (total * freelancerBps) / 10000;
        uint256 clientRefund = total - freelancerAmount;

        job.escrowRemaining = 0;
        job.paymentReleased = true;
        job.status = JobStatus.COMPLETED;

        if (freelancerAmount > 0) {
            require(
                stablecoin.transfer(job.freelancer, freelancerAmount),
                "Freelancer payout failed"
            );
        }
        if (clientRefund > 0) {
            require(
                stablecoin.transfer(job.client, clientRefund),
                "Client refund failed"
            );
        }

        job.currentMilestone = job.milestoneCount;
        emit DisputeResolved(_jobId, freelancerBps > 0);
        emit DisputePayout(_jobId, freelancerAmount, clientRefund);
    }

    /**
     * @dev Client approves current milestone and releases payment
     */
    function approveMilestone(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.client, "Only client can approve");
        require(job.status == JobStatus.SUBMITTED, "Milestone not submitted");

        _releaseCurrentMilestone(job);
        emit MilestoneApproved(_jobId, job.currentMilestone - 1);
    }

    /**
     * @dev Release payment to freelancer after approval
     */
    function releasePayment(uint256 _jobId) internal {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.APPROVED, "Job not approved");
        require(!job.paymentReleased, "Payment already released");

        job.paymentReleased = true;
        job.status = JobStatus.COMPLETED;
        job.escrowRemaining = 0;

        require(
            stablecoin.transfer(job.freelancer, job.budget),
            "Payment transfer failed"
        );

        emit PaymentReleased(_jobId, job.freelancer);
    }

    function _releaseCurrentMilestone(Job storage job) internal {
        uint256 index = job.currentMilestone;
        require(index < job.milestoneCount, "All milestones complete");

        Milestone storage m = jobMilestones[job.id][index];
        require(m.submitted, "Milestone not submitted");
        require(!m.released, "Milestone already paid");

        m.approved = true;
        m.released = true;

        job.escrowRemaining -= m.amount;
        require(
            stablecoin.transfer(job.freelancer, m.amount),
            "Payment transfer failed"
        );
        emit MilestonePaid(job.id, index, m.amount);

        job.currentMilestone += 1;
        if (job.currentMilestone >= job.milestoneCount) {
            job.paymentReleased = true;
            job.status = JobStatus.COMPLETED;
            emit PaymentReleased(job.id, job.freelancer);
        } else {
            job.status = JobStatus.IN_PROGRESS;
        }
    }

    /**
     * @dev Refund client if dispute is not approved
     */
    function refundClient(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.client, "Only client can refund");
        require(job.status == JobStatus.DISPUTED, "Job not disputed");
        require(job.escrowRemaining > 0, "No escrow remaining");

        job.status = JobStatus.COMPLETED;
        require(
            stablecoin.transfer(job.client, job.escrowRemaining),
            "Refund failed"
        );
        job.escrowRemaining = 0;
    }

    /**
     * @dev Get all jobs by client
     */
    function getClientJobs(address _client)
        external
        view
        returns (uint256[] memory)
    {
        return clientJobs[_client];
    }

    /**
     * @dev Get all jobs by freelancer
     */
    function getFreelancerJobs(address _freelancer)
        external
        view
        returns (uint256[] memory)
    {
        return freelancerJobs[_freelancer];
    }

    /**
     * @dev Get job details
     */
    function getJob(uint256 _jobId)
        external
        view
        returns (Job memory)
    {
        return jobs[_jobId];
    }

    function getMilestoneCount(uint256 _jobId) external view returns (uint256) {
        return jobs[_jobId].milestoneCount;
    }

    function getMilestone(uint256 _jobId, uint256 _index)
        external
        view
        returns (Milestone memory)
    {
        require(_index < jobMilestones[_jobId].length, "Invalid index");
        return jobMilestones[_jobId][_index];
    }

    /**
     * @dev Update AI agent address (only owner)
     */
    function setAIAgent(address _newAgent) external onlyOwner {
        aiAgent = _newAgent;
    }
}
