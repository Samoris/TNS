// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @dev Interface to the TNS Registry
 */
interface ITNSRegistry {
    function getDomainOwner(string calldata domain) external view returns (address);
    function isExpired(string calldata domain) external view returns (bool);
    function resolver(string calldata domain) external view returns (address);
}

/**
 * @dev Interface to the TNS Resolver
 */
interface ITNSResolver {
    function addr(string calldata domain) external view returns (address);
}

/**
 * @title TNS Payment Forwarder
 * @dev Allows sending payments directly to .trust domain names
 * @notice This contract resolves domain names to addresses and forwards payments
 */
contract TNSPaymentForwarder is ReentrancyGuard {
    
    // Events
    event PaymentSent(
        string indexed domain,
        address indexed recipient,
        address indexed sender,
        uint256 amount
    );
    
    event PaymentFailed(
        string indexed domain,
        address indexed sender,
        uint256 amount,
        string reason
    );
    
    // Reference to the registry contract
    ITNSRegistry public registry;
    
    /**
     * @dev Constructor - sets the registry contract address
     * @param registryAddress Address of the TNSRegistryERC721 contract
     */
    constructor(address registryAddress) {
        require(registryAddress != address(0), "Invalid registry address");
        registry = ITNSRegistry(registryAddress);
    }
    
    /**
     * @dev Send payment to a .trust domain name
     * @param domain The domain name (without .trust extension)
     * @notice Resolves the domain to an address and forwards the payment
     */
    function sendToTrustDomain(string calldata domain) 
        external 
        payable 
        nonReentrant 
    {
        require(msg.value > 0, "Payment amount must be greater than 0");
        
        // Check if domain exists and is not expired
        address owner = registry.getDomainOwner(domain);
        require(owner != address(0), "Domain not registered");
        require(!registry.isExpired(domain), "Domain has expired");
        
        // Get resolver for the domain
        address resolverAddress = registry.resolver(domain);
        
        // Determine recipient address
        address payable recipient;
        
        if (resolverAddress != address(0)) {
            // Domain has a resolver, try to get the resolved address
            ITNSResolver resolver = ITNSResolver(resolverAddress);
            address resolvedAddress = resolver.addr(domain);
            
            if (resolvedAddress != address(0)) {
                // Use resolved address if set
                recipient = payable(resolvedAddress);
            } else {
                // No address set in resolver, use domain owner
                recipient = payable(owner);
            }
        } else {
            // No resolver set, use domain owner
            recipient = payable(owner);
        }
        
        // Forward the payment
        (bool success, ) = recipient.call{value: msg.value}("");
        
        if (success) {
            emit PaymentSent(domain, recipient, msg.sender, msg.value);
        } else {
            // Revert on failure
            emit PaymentFailed(domain, msg.sender, msg.value, "Transfer failed");
            revert("Payment transfer failed");
        }
    }
    
    /**
     * @dev Resolve a domain to its payment address
     * @param domain The domain name (without .trust extension)
     * @return The payment address for the domain
     * @notice Returns the resolver address if set, otherwise the domain owner
     */
    function resolvePaymentAddress(string calldata domain) 
        external 
        view 
        returns (address) 
    {
        // Check if domain exists and is not expired
        address owner = registry.getDomainOwner(domain);
        if (owner == address(0) || registry.isExpired(domain)) {
            return address(0);
        }
        
        // Get resolver for the domain
        address resolverAddress = registry.resolver(domain);
        
        if (resolverAddress != address(0)) {
            // Domain has a resolver, try to get the resolved address
            ITNSResolver resolver = ITNSResolver(resolverAddress);
            address resolvedAddress = resolver.addr(domain);
            
            if (resolvedAddress != address(0)) {
                // Return resolved address if set
                return resolvedAddress;
            }
        }
        
        // Return domain owner as fallback
        return owner;
    }
    
    /**
     * @dev Batch resolve multiple domains to their payment addresses
     * @param domains Array of domain names (without .trust extension)
     * @return addresses Array of payment addresses corresponding to the domains
     */
    function batchResolvePaymentAddress(string[] calldata domains) 
        external 
        view 
        returns (address[] memory addresses) 
    {
        addresses = new address[](domains.length);
        
        for (uint256 i = 0; i < domains.length; i++) {
            addresses[i] = this.resolvePaymentAddress(domains[i]);
        }
        
        return addresses;
    }
}
