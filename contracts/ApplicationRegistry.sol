// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ApplicationRegistry {
    event ApplicationSubmitted(
        uint256 indexed jobId,
        address indexed freelancer,
        bytes32 applicationHash,
        string metadataURI
    );

    function submitApplication(
        uint256 jobId,
        bytes32 applicationHash,
        string calldata metadataURI
    ) external {
        emit ApplicationSubmitted(jobId, msg.sender, applicationHash, metadataURI);
    }
}
