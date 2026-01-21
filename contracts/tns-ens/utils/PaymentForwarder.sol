//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "../registry/TNS.sol";
import "../resolvers/profiles/IAddrResolver.sol";

/**
 * @dev PaymentForwarder for TNS.
 * Allows sending TRUST tokens to .trust domain names.
 * Resolves the domain to an address and forwards the payment.
 */
contract PaymentForwarder {
    TNS public immutable tns;
    
    // namehash of 'trust' - keccak256(abi.encodePacked(bytes32(0), keccak256("trust")))
    bytes32 private constant TRUST_NODE = 
        0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985;

    event PaymentForwarded(
        string indexed name,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    error DomainNotRegistered(string name);
    error NoResolverSet(string name);
    error NoAddressSet(string name);
    error PaymentFailed();

    constructor(TNS _tns) {
        tns = _tns;
    }

    /**
     * @dev Send TRUST to a .trust domain name.
     * @param name The domain name (without .trust suffix)
     */
    function sendTo(string calldata name) external payable {
        bytes32 labelhash = keccak256(bytes(name));
        bytes32 node = keccak256(abi.encodePacked(TRUST_NODE, labelhash));
        
        // Get resolver
        address resolverAddr = tns.resolver(node);
        if (resolverAddr == address(0)) {
            revert NoResolverSet(name);
        }
        
        // Get address from resolver
        IAddrResolver resolver = IAddrResolver(resolverAddr);
        address payable recipient = resolver.addr(node);
        
        if (recipient == address(0)) {
            revert NoAddressSet(name);
        }
        
        // Forward payment
        (bool success, ) = recipient.call{value: msg.value}("");
        if (!success) {
            revert PaymentFailed();
        }
        
        emit PaymentForwarded(name, msg.sender, recipient, msg.value);
    }

    /**
     * @dev Resolve a .trust domain to its address.
     * @param name The domain name (without .trust suffix)
     * @return The resolved address
     */
    function resolve(string calldata name) external view returns (address) {
        bytes32 labelhash = keccak256(bytes(name));
        bytes32 node = keccak256(abi.encodePacked(TRUST_NODE, labelhash));
        
        address resolverAddr = tns.resolver(node);
        if (resolverAddr == address(0)) {
            return address(0);
        }
        
        return IAddrResolver(resolverAddr).addr(node);
    }

    /**
     * @dev Get the namehash for a .trust domain.
     * @param name The domain name (without .trust suffix)
     * @return The namehash
     */
    function namehash(string calldata name) external pure returns (bytes32) {
        bytes32 labelhash = keccak256(bytes(name));
        return keccak256(abi.encodePacked(TRUST_NODE, labelhash));
    }
}
