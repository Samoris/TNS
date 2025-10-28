// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Whitelist Manager Interface
 */
interface IWhitelistManager {
    function canMintFree(address user) external view returns (bool canMintFree, uint256 remainingMints);
    function useFreeMint(address user, string calldata domain) external;
}

/**
 * @title TNS Registry - Full ERC721 NFT Implementation
 * @dev Domain registration contract that mints actual ERC-721 NFTs for .trust domains
 * @notice REMIX DEPLOYMENT VERSION - Compatible with latest OpenZeppelin
 */
contract TNSRegistryERC721 is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // Events
    event DomainRegistered(
        string indexed domain, 
        address indexed owner, 
        uint256 indexed tokenId, 
        uint256 expirationTime
    );
    
    event DomainRenewed(
        string indexed domain, 
        uint256 indexed tokenId, 
        uint256 expirationTime
    );
    
    event DomainBurned(
        string indexed domain,
        uint256 indexed tokenId,
        address indexed burner
    );
    
    event PrimaryDomainSet(
        address indexed owner,
        string indexed domain
    );
    
    event ResolverChanged(
        string indexed domain,
        address indexed resolver
    );
    
    // Domain data structure
    struct Domain {
        string name;
        uint256 expirationTime;
        bool exists;
    }
    
    // Storage mappings
    mapping(string => Domain) public domains;
    mapping(string => uint256) public domainToTokenId;
    mapping(uint256 => string) public tokenIdToDomain;
    mapping(address => string[]) private ownerDomains;
    mapping(address => string) public primaryDomain;
    mapping(string => address) public resolvers;
    
    // Front-running protection
    mapping(bytes32 => uint256) private commitments;
    mapping(address => uint256) private lastRegistrationBlock;
    
    // Whitelist integration
    IWhitelistManager public whitelistManager;
    
    // Token ID counter
    uint256 private _nextTokenId = 1;
    
    // Pricing constants (in wei)
    uint256 public constant PRICE_3_CHARS = 100 ether;  // 100 TRUST/year
    uint256 public constant PRICE_4_CHARS = 70 ether;   // 70 TRUST/year  
    uint256 public constant PRICE_5_PLUS = 30 ether;    // 30 TRUST/year
    
    // Front-running protection constants
    uint256 public constant MIN_COMMITMENT_AGE = 1 minutes;
    uint256 public constant MAX_COMMITMENT_AGE = 24 hours;
    uint256 public constant MIN_REGISTRATION_INTERVAL = 2;
    
    // Grace period
    uint256 public constant GRACE_PERIOD = 30 days;
    
    modifier validDomain(string calldata domain) {
        require(bytes(domain).length >= 3, "Domain too short");
        require(bytes(domain).length <= 63, "Domain too long");
        _;
    }
    
    /**
     * @dev Constructor - Initialize ERC721 with name and symbol
     * @notice Compatible with OpenZeppelin v5.x
     */
    constructor() ERC721("Trust Name Service", "TNS") Ownable(msg.sender) {}
    
    /**
     * @dev Set whitelist manager
     */
    function setWhitelistManager(address _whitelistManager) external onlyOwner {
        require(_whitelistManager != address(0), "Invalid address");
        whitelistManager = IWhitelistManager(_whitelistManager);
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @dev Get next token ID
     */
    function nextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @dev Calculate registration cost
     */
    function calculateCost(string calldata domain, uint256 duration) 
        public 
        pure 
        returns (uint256) 
    {
        require(duration > 0 && duration <= 10, "Invalid duration");
        
        uint256 length = bytes(domain).length;
        uint256 pricePerYear;
        
        if (length == 3) {
            pricePerYear = PRICE_3_CHARS;
        } else if (length == 4) {
            pricePerYear = PRICE_4_CHARS;
        } else {
            pricePerYear = PRICE_5_PLUS;
        }
        
        return pricePerYear * duration;
    }
    
    /**
     * @dev Make commitment (front-running protection)
     */
    function makeCommitment(bytes32 commitment) external {
        require(commitment != bytes32(0), "Invalid commitment");
        commitments[commitment] = block.timestamp;
    }
    
    /**
     * @dev Register domain (main function)
     */
    function register(string calldata domain, uint256 duration, bytes32 secret) 
        external 
        payable 
        nonReentrant
        validDomain(domain) 
    {
        // Verify commitment
        bytes32 commitment = keccak256(abi.encodePacked(domain, msg.sender, secret));
        uint256 commitmentTime = commitments[commitment];
        require(commitmentTime > 0, "No commitment");
        require(block.timestamp >= commitmentTime + MIN_COMMITMENT_AGE, "Commitment too new");
        require(block.timestamp <= commitmentTime + MAX_COMMITMENT_AGE, "Commitment expired");
        
        // Check domain availability
        require(!domains[domain].exists || isExpired(domain), "Domain taken");
        
        // Rate limiting
        require(
            block.number >= lastRegistrationBlock[msg.sender] + MIN_REGISTRATION_INTERVAL,
            "Too fast"
        );
        
        // Calculate cost
        uint256 cost = calculateCost(domain, duration);
        uint256 domainLength = bytes(domain).length;
        
        // Check whitelist for 5+ character domains only
        bool isWhitelisted = false;
        if (address(whitelistManager) != address(0) && domainLength >= 5) {
            (bool canMint, ) = whitelistManager.canMintFree(msg.sender);
            if (canMint) {
                isWhitelisted = true;
                whitelistManager.useFreeMint(msg.sender, domain);
            }
        }
        
        // Handle payment
        if (!isWhitelisted) {
            require(msg.value >= cost, "Insufficient payment");
            
            // Refund excess
            if (msg.value > cost) {
                (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - cost}("");
                require(refundSuccess, "Refund failed");
            }
        } else {
            // Whitelisted: refund all payment
            if (msg.value > 0) {
                (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value}("");
                require(refundSuccess, "Refund failed");
            }
        }
        
        // Mint NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        // Set domain data
        uint256 expirationTime = block.timestamp + (duration * 365 days);
        domains[domain] = Domain({
            name: domain,
            expirationTime: expirationTime,
            exists: true
        });
        
        domainToTokenId[domain] = tokenId;
        tokenIdToDomain[tokenId] = domain;
        ownerDomains[msg.sender].push(domain);
        
        lastRegistrationBlock[msg.sender] = block.number;
        delete commitments[commitment];
        
        emit DomainRegistered(domain, msg.sender, tokenId, expirationTime);
    }
    
    /**
     * @dev Renew domain
     */
    function renew(string calldata domain, uint256 additionalYears) 
        external 
        payable 
        nonReentrant
        validDomain(domain) 
    {
        require(domains[domain].exists, "Domain not registered");
        require(additionalYears > 0 && additionalYears <= 10, "Invalid duration");
        
        uint256 tokenId = domainToTokenId[domain];
        address domainOwner = ownerOf(tokenId);
        
        // Within grace period, only owner can renew
        if (isExpired(domain) && !isGracePeriodExpired(domain)) {
            require(msg.sender == domainOwner, "Only owner can renew in grace period");
        }
        
        // Calculate cost
        uint256 cost = calculateCost(domain, additionalYears);
        require(msg.value >= cost, "Insufficient payment");
        
        // Extend expiration
        uint256 currentExpiration = domains[domain].expirationTime;
        uint256 baseTime = block.timestamp > currentExpiration ? block.timestamp : currentExpiration;
        uint256 extensionTime = additionalYears * 365 days;
        uint256 newExpiration = baseTime + extensionTime;
        
        domains[domain].expirationTime = newExpiration;
        
        // Refund excess
        if (msg.value > cost) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - cost}("");
            require(success, "Refund failed");
        }
        
        emit DomainRenewed(domain, tokenId, newExpiration);
    }
    
    /**
     * @dev Check if domain is expired
     */
    function isExpired(string memory domain) public view returns (bool) {
        if (!domains[domain].exists) return false;
        return block.timestamp > domains[domain].expirationTime;
    }
    
    /**
     * @dev Check if grace period expired
     */
    function isGracePeriodExpired(string memory domain) public view returns (bool) {
        if (!domains[domain].exists) return false;
        return block.timestamp > domains[domain].expirationTime + GRACE_PERIOD;
    }
    
    /**
     * @dev Get domain owner (returns zero address if expired)
     */
    function getDomainOwner(string calldata domain) external view returns (address) {
        if (!domains[domain].exists || isExpired(domain)) {
            return address(0);
        }
        uint256 tokenId = domainToTokenId[domain];
        return ownerOf(tokenId);
    }
    
    /**
     * @dev Burn expired domain NFT
     */
    function burnExpiredDomain(string calldata domain) external validDomain(domain) {
        require(domains[domain].exists, "Domain not registered");
        require(isGracePeriodExpired(domain), "Grace period not expired");
        
        uint256 tokenId = domainToTokenId[domain];
        
        _burn(tokenId);
        
        delete domains[domain];
        delete domainToTokenId[domain];
        delete tokenIdToDomain[tokenId];
        delete resolvers[domain];
        
        emit DomainBurned(domain, tokenId, msg.sender);
    }
    
    /**
     * @dev Override _update to handle domain ownership
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721URIStorage)
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        
        // Update owner domains list
        if (from != address(0) && from != to) {
            string memory domain = tokenIdToDomain[tokenId];
            
            // Remove from old owner
            string[] storage oldOwnerDomainsList = ownerDomains[from];
            for (uint i = 0; i < oldOwnerDomainsList.length; i++) {
                if (keccak256(bytes(oldOwnerDomainsList[i])) == keccak256(bytes(domain))) {
                    oldOwnerDomainsList[i] = oldOwnerDomainsList[oldOwnerDomainsList.length - 1];
                    oldOwnerDomainsList.pop();
                    break;
                }
            }
            
            // Clear primary domain if it was set
            if (keccak256(bytes(primaryDomain[from])) == keccak256(bytes(domain))) {
                delete primaryDomain[from];
            }
        }
        
        // Add to new owner
        if (to != address(0) && from != to) {
            ownerDomains[to].push(tokenIdToDomain[tokenId]);
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Override tokenURI
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Set primary domain
     */
    function setPrimaryDomain(string calldata domain) external validDomain(domain) {
        require(domains[domain].exists, "Domain does not exist");
        require(!isExpired(domain), "Domain expired");
        
        uint256 tokenId = domainToTokenId[domain];
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        primaryDomain[msg.sender] = domain;
        emit PrimaryDomainSet(msg.sender, domain);
    }
    
    /**
     * @dev Get primary domain
     */
    function getPrimaryDomain(address owner) external view returns (string memory) {
        return primaryDomain[owner];
    }
    
    /**
     * @dev Set resolver
     */
    function setResolver(string calldata domain, address resolverAddress) 
        external 
        validDomain(domain) 
    {
        require(domains[domain].exists, "Domain does not exist");
        require(!isExpired(domain), "Domain expired");
        
        uint256 tokenId = domainToTokenId[domain];
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        
        resolvers[domain] = resolverAddress;
        emit ResolverChanged(domain, resolverAddress);
    }
    
    /**
     * @dev Get resolver
     */
    function resolver(string calldata domain) external view returns (address) {
        if (!domains[domain].exists || isExpired(domain)) {
            return address(0);
        }
        return resolvers[domain];
    }
    
    /**
     * @dev Withdraw funds
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Reject direct payments
     */
    receive() external payable {
        revert("Use register() or renew()");
    }
}
