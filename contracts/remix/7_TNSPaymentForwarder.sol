// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY ORDER: 7 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address (from step 1)
//   _resolver: TNSResolver address (from step 6)
//   _baseNode: Same as step 2 - keccak256(abi.encodePacked(bytes32(0), keccak256("trust")))
// ============================================

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ITNS {
    function owner(bytes32 node) external view returns (address);
}

interface ITNSResolver {
    function addr(bytes32 node) external view returns (address);
}

contract TNSPaymentForwarder is ReentrancyGuard {
    ITNS public immutable tns;
    ITNSResolver public immutable resolver;
    bytes32 public immutable baseNode;

    event PaymentForwarded(
        string indexed domainName,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    constructor(
        ITNS _tns,
        ITNSResolver _resolver,
        bytes32 _baseNode
    ) {
        tns = _tns;
        resolver = _resolver;
        baseNode = _baseNode;
    }

    function sendPayment(string calldata domainName) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(bytes(domainName).length > 0, "Domain name required");

        bytes32 labelHash = keccak256(bytes(domainName));
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));

        address recipient = resolver.addr(node);
        require(recipient != address(0), "Domain has no address set");

        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Transfer failed");

        emit PaymentForwarded(domainName, msg.sender, recipient, msg.value);
    }

    function resolveAddress(string calldata domainName) external view returns (address) {
        bytes32 labelHash = keccak256(bytes(domainName));
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));
        return resolver.addr(node);
    }

    receive() external payable {}
}
