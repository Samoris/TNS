// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY FIRST (Optional Helper)
// No constructor parameters
// 
// Deploy this, then call each function to get
// the hash values you need for other contracts.
// You can delete it after getting the values.
// ============================================

contract HashHelper {
    // Returns: The baseNode for .trust TLD
    // Use this for: TNSBaseRegistrar constructor, TNSPaymentForwarder constructor
    function getBaseNode() public pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes32(0), keccak256("trust")));
    }

    // Returns: keccak256("trust")
    // Use this for: setSubnodeOwner when transferring .trust TLD
    function getTrustLabel() public pure returns (bytes32) {
        return keccak256("trust");
    }
    
    // Returns: keccak256("reverse")
    // Use this for: Creating .reverse TLD
    function getReverseLabel() public pure returns (bytes32) {
        return keccak256("reverse");
    }
    
    // Returns: keccak256("addr")
    // Use this for: Creating addr.reverse node
    function getAddrLabel() public pure returns (bytes32) {
        return keccak256("addr");
    }
    
    // Returns: The node for .reverse TLD
    // Use this for: setSubnodeOwner when creating addr.reverse
    function getReverseNode() public pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes32(0), keccak256("reverse")));
    }

    // Returns: The node for addr.reverse (where reverse resolution happens)
    // This should equal: 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2
    function getAddrReverseNode() public pure returns (bytes32) {
        bytes32 reverseNode = keccak256(abi.encodePacked(bytes32(0), keccak256("reverse")));
        return keccak256(abi.encodePacked(reverseNode, keccak256("addr")));
    }

    // Helper: Get the root node (all zeros)
    function getRootNode() public pure returns (bytes32) {
        return bytes32(0);
    }
}
