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


// File contracts/TNSResolver.sol

// Original license: SPDX_License_Identifier: MIT

/**
 * @dev Interface to the Registry contract
 */
interface ITNSRegistry {
    function getDomainOwner(string calldata domain) external view returns (address);
    function isExpired(string calldata domain) external view returns (bool);
}

/**
 * @title TNS Resolver
 * @dev Stores and resolves domain data (addresses, content hashes, text records)
 * @notice This contract handles all resolution queries for .trust domains
 * @notice Only domain owners can update their domain's records
 */
contract TNSResolver is ReentrancyGuard {
    
    // Events
    event AddressChanged(string indexed domain, address newAddress);
    event ContenthashChanged(string indexed domain, bytes contenthash);
    event TextChanged(string indexed domain, string indexed key, string value);
    event ResolverCleared(string indexed domain);
    
    // Reference to the registry contract
    ITNSRegistry public registry;
    
    // Storage mappings
    mapping(string => address) private addresses;           // domain => ETH address
    mapping(string => bytes) private contenthashes;         // domain => IPFS/content hash
    mapping(string => mapping(string => string)) private texts; // domain => key => value
    
    // Supported text record keys
    string[] private supportedTextKeys = [
        "email",
        "url", 
        "avatar",
        "description",
        "notice",
        "keywords",
        "com.discord",
        "com.github",
        "com.reddit",
        "com.twitter",
        "org.telegram"
    ];
    
    /**
     * @dev Modifier to check if caller is authorized to modify domain records
     */
    modifier onlyDomainOwner(string calldata domain) {
        address owner = registry.getDomainOwner(domain);
        require(owner != address(0), "Domain not registered or expired");
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    /**
     * @dev Constructor - sets the registry contract address
     * @param registryAddress Address of the TNSRegistryERC721 contract
     */
    constructor(address registryAddress) {
        require(registryAddress != address(0), "Invalid registry address");
        registry = ITNSRegistry(registryAddress);
    }
    
    /**
     * @dev Set the ETH address for a domain
     * @param domain The domain name (without .trust)
     * @param newAddress The ETH address to set
     */
    function setAddr(string calldata domain, address newAddress) 
        external 
        nonReentrant
        onlyDomainOwner(domain) 
    {
        addresses[domain] = newAddress;
        emit AddressChanged(domain, newAddress);
    }
    
    /**
     * @dev Get the ETH address for a domain
     * @param domain The domain name (without .trust)
     * @return The ETH address (address(0) if not set)
     */
    function addr(string calldata domain) external view returns (address) {
        // Check if domain is expired
        if (registry.isExpired(domain)) {
            return address(0);
        }
        return addresses[domain];
    }
    
    /**
     * @dev Set the content hash (IPFS/IPNS) for a domain
     * @param domain The domain name (without .trust)
     * @param hash The content hash bytes
     */
    function setContenthash(string calldata domain, bytes calldata hash) 
        external 
        nonReentrant
        onlyDomainOwner(domain) 
    {
        contenthashes[domain] = hash;
        emit ContenthashChanged(domain, hash);
    }
    
    /**
     * @dev Get the content hash for a domain
     * @param domain The domain name (without .trust)
     * @return The content hash bytes
     */
    function contenthash(string calldata domain) external view returns (bytes memory) {
        if (registry.isExpired(domain)) {
            return "";
        }
        return contenthashes[domain];
    }
    
    /**
     * @dev Set a text record for a domain
     * @param domain The domain name (without .trust)
     * @param key The text record key (e.g., "email", "url", "avatar")
     * @param value The text record value
     */
    function setText(string calldata domain, string calldata key, string calldata value) 
        external 
        nonReentrant
        onlyDomainOwner(domain) 
    {
        texts[domain][key] = value;
        emit TextChanged(domain, key, value);
    }
    
    /**
     * @dev Get a text record for a domain
     * @param domain The domain name (without .trust)
     * @param key The text record key
     * @return The text record value
     */
    function text(string calldata domain, string calldata key) 
        external 
        view 
        returns (string memory) 
    {
        if (registry.isExpired(domain)) {
            return "";
        }
        return texts[domain][key];
    }
    
    /**
     * @dev Get all text records for a domain
     * @param domain The domain name (without .trust)
     * @return keys Array of text record keys
     * @return values Array of text record values
     */
    function getAllTextRecords(string calldata domain) 
        external 
        view 
        returns (string[] memory keys, string[] memory values) 
    {
        if (registry.isExpired(domain)) {
            return (new string[](0), new string[](0));
        }
        
        // Count non-empty records
        uint256 count = 0;
        for (uint256 i = 0; i < supportedTextKeys.length; i++) {
            if (bytes(texts[domain][supportedTextKeys[i]]).length > 0) {
                count++;
            }
        }
        
        // Build return arrays
        keys = new string[](count);
        values = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < supportedTextKeys.length; i++) {
            string memory value = texts[domain][supportedTextKeys[i]];
            if (bytes(value).length > 0) {
                keys[index] = supportedTextKeys[i];
                values[index] = value;
                index++;
            }
        }
        
        return (keys, values);
    }
    
    /**
     * @dev Get complete resolver data for a domain
     * @param domain The domain name (without .trust)
     * @return ethAddress The ETH address
     * @return contentHash The content hash
     * @return textKeys Array of text record keys
     * @return textValues Array of text record values
     */
    function getResolverData(string calldata domain) 
        external 
        view 
        returns (
            address ethAddress,
            bytes memory contentHash,
            string[] memory textKeys,
            string[] memory textValues
        ) 
    {
        if (registry.isExpired(domain)) {
            return (address(0), "", new string[](0), new string[](0));
        }
        
        ethAddress = addresses[domain];
        contentHash = contenthashes[domain];
        (textKeys, textValues) = this.getAllTextRecords(domain);
        
        return (ethAddress, contentHash, textKeys, textValues);
    }
    
    /**
     * @dev Clear all resolver records for a domain
     * @param domain The domain name (without .trust)
     * @notice Only domain owner can clear records
     * @notice Emits per-key events for better traceability
     */
    function clearRecords(string calldata domain) 
        external 
        nonReentrant
        onlyDomainOwner(domain) 
    {
        // Clear address and emit event if set
        if (addresses[domain] != address(0)) {
            delete addresses[domain];
            emit AddressChanged(domain, address(0));
        }
        
        // Clear contenthash and emit event if set
        if (contenthashes[domain].length > 0) {
            delete contenthashes[domain];
            emit ContenthashChanged(domain, "");
        }
        
        // Clear all text records and emit per-key events
        for (uint256 i = 0; i < supportedTextKeys.length; i++) {
            string memory key = supportedTextKeys[i];
            if (bytes(texts[domain][key]).length > 0) {
                delete texts[domain][key];
                emit TextChanged(domain, key, "");
            }
        }
        
        emit ResolverCleared(domain);
    }
    
    /**
     * @dev Get supported text record keys
     * @return Array of supported text record keys
     */
    function getSupportedTextKeys() external view returns (string[] memory) {
        return supportedTextKeys;
    }
    
    /**
     * @dev Check if a text key is supported
     * @param key The text record key to check
     * @return true if supported, false otherwise
     */
    function isTextKeySupported(string calldata key) external view returns (bool) {
        for (uint256 i = 0; i < supportedTextKeys.length; i++) {
            if (keccak256(bytes(supportedTextKeys[i])) == keccak256(bytes(key))) {
                return true;
            }
        }
        return false;
    }
}
