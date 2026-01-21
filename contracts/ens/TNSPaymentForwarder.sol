// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./TNSResolver.sol";
import "./IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TNSPaymentForwarder is ReentrancyGuard {
    ITNS public immutable tns;
    TNSResolver public immutable resolver;
    IERC20 public immutable trustToken;
    bytes32 public immutable baseNode;

    event PaymentForwarded(
        string indexed domainName,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    constructor(
        ITNS _tns,
        TNSResolver _resolver,
        IERC20 _trustToken,
        bytes32 _baseNode
    ) {
        tns = _tns;
        resolver = _resolver;
        trustToken = _trustToken;
        baseNode = _baseNode;
    }

    function sendPayment(string calldata domainName, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(domainName).length > 0, "Domain name required");

        bytes32 labelHash = keccak256(bytes(domainName));
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));

        address recipient = resolver.addr(node);
        require(recipient != address(0), "Domain has no address set");

        require(
            trustToken.transferFrom(msg.sender, recipient, amount),
            "Transfer failed"
        );

        emit PaymentForwarded(domainName, msg.sender, recipient, amount);
    }

    function resolveAddress(string calldata domainName) external view returns (address) {
        bytes32 labelHash = keccak256(bytes(domainName));
        bytes32 node = keccak256(abi.encodePacked(baseNode, labelHash));
        return resolver.addr(node);
    }
}
