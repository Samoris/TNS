// Sources flattened with hardhat v2.27.2 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/TNSPaymentForwarder.sol

// Original license: SPDX_License_Identifier: MIT

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
