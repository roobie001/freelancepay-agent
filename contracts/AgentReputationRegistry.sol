// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AgentReputationRegistry {
    struct Reputation {
        int256 score;
        uint256 count;
    }

    mapping(uint256 => Reputation) public reputationByAgent;

    event ReputationSubmitted(
        uint256 indexed agentId,
        address indexed rater,
        int8 rating,
        string metadataURI
    );

    function submitReputation(
        uint256 agentId,
        int8 rating,
        string calldata metadataURI
    ) external {
        require(rating >= -5 && rating <= 5, "Rating out of range");
        Reputation storage rep = reputationByAgent[agentId];
        rep.score += rating;
        rep.count += 1;

        emit ReputationSubmitted(agentId, msg.sender, rating, metadataURI);
    }

    function getReputation(uint256 agentId)
        external
        view
        returns (int256 score, uint256 count)
    {
        Reputation storage rep = reputationByAgent[agentId];
        return (rep.score, rep.count);
    }
}
