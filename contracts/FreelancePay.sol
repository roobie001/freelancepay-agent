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
    }

    uint256 public jobCounter;
    mapping(uint256 => Job) public jobs;
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
            paymentReleased: false
        });

        clientJobs[msg.sender].push(jobId);

        emit JobCreated(jobId, msg.sender, _budget, _title);
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

        job.status = JobStatus.SUBMITTED;
        job.submissionTime = block.timestamp;
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
            releasePayment(_jobId);
            emit DisputeResolved(_jobId, true);
        } else {
            job.status = JobStatus.DISPUTED;
            emit DisputeResolved(_jobId, false);
        }
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

        require(
            stablecoin.transfer(job.freelancer, job.budget),
            "Payment transfer failed"
        );

        emit PaymentReleased(_jobId, job.freelancer);
    }

    /**
     * @dev Refund client if dispute is not approved
     */
    function refundClient(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.client, "Only client can refund");
        require(job.status == JobStatus.DISPUTED, "Job not disputed");
        require(!job.paymentReleased, "Already paid out");

        job.status = JobStatus.COMPLETED;
        require(
            stablecoin.transfer(job.client, job.budget),
            "Refund failed"
        );
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

    /**
     * @dev Update AI agent address (only owner)
     */
    function setAIAgent(address _newAgent) external onlyOwner {
        aiAgent = _newAgent;
    }
}
