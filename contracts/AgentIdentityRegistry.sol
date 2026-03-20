// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AgentIdentityRegistry {
    struct AgentIdentity {
        address owner;
        string uri;
    }

    uint256 private _agentCounter;
    mapping(uint256 => AgentIdentity) public agentIdentities;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri);

    function registerAgent(string calldata uri) external returns (uint256) {
        _agentCounter += 1;
        uint256 agentId = _agentCounter;
        agentIdentities[agentId] = AgentIdentity({ owner: msg.sender, uri: uri });

        emit AgentRegistered(agentId, msg.sender, uri);
        return agentId;
    }
}
