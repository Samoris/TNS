// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TNS Registry - Full ERC721 NFT Implementation with Whitelist
 * @dev Domain registration contract that mints actual ERC-721 NFTs for .trust domains
 * @notice Includes whitelist functionality for free domain minting
 * @notice Each registered domain is a real NFT that can be transferred and traded
 * @notice Includes reentrancy protection, front-running protection, and overflow checks
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
    
    event WhitelistAdded(
        address indexed account,
        uint256 freeMints
    );
    
    event WhitelistRemoved(
        address indexed account
    );
    
    event WhitelistUsed(
        address indexed account,
        string indexed domain,
        uint256 remaining
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
    mapping(address => string) public primaryDomain; // Primary domain for each address
    mapping(string => address) public resolvers; // Domain => Resolver contract address
    
    // Front-running protection: commitment scheme
    mapping(bytes32 => uint256) private commitments;
    mapping(address => uint256) private lastRegistrationBlock;
    
    // Whitelist: address => remaining free mints
    mapping(address => uint256) public whitelist;
    
    // Token ID counter
    uint256 private _nextTokenId = 1;
    
    // Pricing constants (in wei) - Fixed TRUST pricing
    uint256 public constant PRICE_3_CHARS = 100 ether;  // 100 TRUST/year
    uint256 public constant PRICE_4_CHARS = 70 ether;   // 70 TRUST/year  
    uint256 public constant PRICE_5_PLUS = 30 ether;    // 30 TRUST/year
    
    // Front-running protection constants
    uint256 public constant MIN_COMMITMENT_AGE = 1 minutes;
    uint256 public constant MAX_COMMITMENT_AGE = 24 hours;
    uint256 public constant MIN_REGISTRATION_INTERVAL = 2;
    
    // Grace period: 30 days after expiration before domain can be re-registered
    uint256 public constant GRACE_PERIOD = 30 days;
    
    modifier validDomain(string calldata domain) {
        require(bytes(domain).length >= 3, "Domain too short");
        require(bytes(domain).length <= 63, "Domain too long");
        _;
    }
    
    constructor() ERC721("Trust Name Service", "TNS") Ownable(msg.sender) {}
    
    /**
     * @dev Add an address to whitelist with specified number of free mints
     * @param account Address to whitelist
     * @param freeMints Number of free domain registrations allowed
     */
    function addToWhitelist(address account, uint256 freeMints) external onlyOwner {
        require(account != address(0), "Invalid address");
        require(freeMints > 0, "Must allow at least 1 free mint");
        
        whitelist[account] = freeMints;
        emit WhitelistAdded(account, freeMints);
    }
    
    /**
     * @dev Add multiple addresses to whitelist at once
     * @param accounts Array of addresses to whitelist
     * @param freeMints Number of free mints for each address
     */
    function addToWhitelistBatch(address[] calldata accounts, uint256 freeMints) external onlyOwner {
        require(freeMints > 0, "Must allow at least 1 free mint");
        
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Invalid address");
            whitelist[accounts[i]] = freeMints;
            emit WhitelistAdded(accounts[i], freeMints);
        }
    }
    
    /**
     * @dev Remove an address from whitelist
     * @param account Address to remove from whitelist
     */
    function removeFromWhitelist(address account) external onlyOwner {
        require(whitelist[account] > 0, "Address not whitelisted");
        
        delete whitelist[account];
        emit WhitelistRemoved(account);
    }
    
    /**
     * @dev Check if an address is whitelisted and has remaining free mints
     * @param account Address to check
     * @return Number of free mints remaining
     */
    function getWhitelistStatus(address account) external view returns (uint256) {
        return whitelist[account];
    }
    
    /**
     * @dev Check if caller is whitelisted
     * @return true if whitelisted with remaining mints
     */
    function isWhitelisted() public view returns (bool) {
        return whitelist[msg.sender] > 0;
    }
    
    /**
     * @dev ERC721 - Get total number of NFTs minted
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    /**
     * @dev ERC721 - Get the next token ID that will be minted
     */
    function nextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @dev Calculate registration cost for a domain
     * @notice Returns 0 if caller is whitelisted with remaining free mints
     */
    function calculateCost(string calldata domain, uint256 duration) 
        public 
        view 
        returns (uint256) 
    {
        require(duration > 0 && duration <= 10, "Invalid duration");
        
        // If whitelisted, registration is free
        if (whitelist[msg.sender] > 0) {
            return 0;
        }
        
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
     * @dev Commit to a domain registration (front-running protection step 1)
     * @param commitment Hash of keccak256(abi.encodePacked(domain, msg.sender, secret))
     */
    function makeCommitment(bytes32 commitment) external {
        require(commitment != bytes32(0), "Invalid commitment");
        commitments[commitment] = block.timestamp;
    }
    
    /**
     * @dev Register a new domain and mint an ERC-721 NFT (with front-running protection)
     * @param domain The domain name to register
     * @param duration Duration in years (1-10)
     * @param secret Secret used in commitment (for front-running protection)
     * @notice Whitelisted addresses can register for free
     */
    function register(string calldata domain, uint256 duration, bytes32 secret) 
        external 
        payable 
        nonReentrant
        validDomain(domain) 
    {
        // Front-running protection: verify commitment
        bytes32 commitment = keccak256(abi.encodePacked(domain, msg.sender, secret));
        uint256 commitmentTime = commitments[commitment];
        require(commitmentTime > 0, "No commitment found");
        require(block.timestamp >= commitmentTime + MIN_COMMITMENT_AGE, "Commitment too new");
        require(block.timestamp <= commitmentTime + MAX_COMMITMENT_AGE, "Commitment expired");
        
        // Rate limiting: prevent rapid registrations from same address
        require(
            block.number >= lastRegistrationBlock[msg.sender] + MIN_REGISTRATION_INTERVAL,
            "Registration too soon"
        );
        
        require(duration > 0 && duration <= 10, "Invalid duration");
        require(isAvailable(domain), "Domain not available or in grace period");
        
        // Check whitelist status
        bool isWhitelistedUser = whitelist[msg.sender] > 0;
        uint256 cost = 0;
        
        if (isWhitelistedUser) {
            // Whitelisted user - free registration
            cost = 0;
            whitelist[msg.sender] -= 1; // Decrement free mints
            emit WhitelistUsed(msg.sender, domain, whitelist[msg.sender]);
        } else {
            // Regular user - calculate cost
            uint256 length = bytes(domain).length;
            uint256 pricePerYear;
            
            if (length == 3) {
                pricePerYear = PRICE_3_CHARS;
            } else if (length == 4) {
                pricePerYear = PRICE_4_CHARS;
            } else {
                pricePerYear = PRICE_5_PLUS;
            }
            
            cost = pricePerYear * duration;
            require(msg.value >= cost, "Insufficient payment");
        }
        
        uint256 tokenId = _nextTokenId++;
        uint256 expirationTime = block.timestamp + (duration * 365 days);
        
        // Store domain data
        domains[domain] = Domain({
            name: domain,
            expirationTime: expirationTime,
            exists: true
        });
        
        domainToTokenId[domain] = tokenId;
        tokenIdToDomain[tokenId] = domain;
        ownerDomains[msg.sender].push(domain);
        
        // Clear commitment after use
        delete commitments[commitment];
        lastRegistrationBlock[msg.sender] = block.number;
        
        // MINT THE ACTUAL ERC-721 NFT
        _safeMint(msg.sender, tokenId);
        
        // Set token URI to the domain name
        _setTokenURI(tokenId, string(abi.encodePacked(domain, ".trust")));
        
        emit DomainRegistered(domain, msg.sender, tokenId, expirationTime);
        
        // Refund excess payment (use call instead of transfer for better compatibility)
        if (msg.value > cost) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - cost}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @dev Renew an existing domain (with overflow protection)
     * @notice Owner can renew even during grace period
     */
    function renew(string calldata domain, uint256 duration) 
        external 
        payable
        nonReentrant
    {
        require(domains[domain].exists, "Domain not registered");
        require(!isExpired(domain) || isInGracePeriod(domain), "Domain past grace period, must re-register");
        
        uint256 tokenId = domainToTokenId[domain];
        require(ownerOf(tokenId) == msg.sender, "Not domain owner");
        require(duration > 0 && duration <= 10, "Invalid duration");
        
        uint256 cost = calculateCost(domain, duration);
        require(msg.value >= cost, "Insufficient payment");
        
        // Fix integer overflow: explicit check before addition
        uint256 extensionTime = duration * 365 days;
        uint256 currentExpiration = domains[domain].expirationTime;
        
        // Check for overflow before adding
        require(
            currentExpiration <= type(uint256).max - extensionTime,
            "Expiration time overflow"
        );
        
        uint256 newExpiration = currentExpiration + extensionTime;
        domains[domain].expirationTime = newExpiration;
        
        emit DomainRenewed(domain, tokenId, newExpiration);
        
        // Refund excess payment (use call instead of transfer)
        if (msg.value > cost) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - cost}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @dev Check if a domain has expired
     */
    function isExpired(string calldata domain) public view returns (bool) {
        if (!domains[domain].exists) return false;
        return block.timestamp > domains[domain].expirationTime;
    }
    
    /**
     * @dev Check if a domain is in the grace period
     * @notice During grace period, only the original owner can renew
     */
    function isInGracePeriod(string calldata domain) public view returns (bool) {
        if (!domains[domain].exists) return false;
        if (block.timestamp <= domains[domain].expirationTime) return false;
        return block.timestamp <= domains[domain].expirationTime + GRACE_PERIOD;
    }
    
    /**
     * @dev Check if a domain is available for registration
     * @notice Domain must be past grace period to be available for new registration
     */
    function isAvailable(string calldata domain) public view returns (bool) {
        if (!domains[domain].exists) return true;
        // Domain is only available after expiration + grace period
        return block.timestamp > domains[domain].expirationTime + GRACE_PERIOD;
    }
    
    /**
     * @dev Burn an expired domain NFT and make it available for re-registration
     * @param domain The domain name to burn
     * @notice Anyone can call this to clean up expired domains after grace period
     * @notice This permanently burns the NFT and clears all domain data
     * @notice Grace period must pass before burning is allowed
     */
    function burnExpiredDomain(string calldata domain) 
        external 
        nonReentrant 
        validDomain(domain) 
    {
        require(domains[domain].exists, "Domain not registered");
        require(isExpired(domain), "Domain not expired");
        require(!isInGracePeriod(domain), "Domain in grace period - owner can still renew");
        
        uint256 tokenId = domainToTokenId[domain];
        address previousOwner = _ownerOf(tokenId);
        
        // Remove domain from previous owner's list
        if (previousOwner != address(0)) {
            string[] storage ownerDomainsList = ownerDomains[previousOwner];
            for (uint i = 0; i < ownerDomainsList.length; i++) {
                if (keccak256(bytes(ownerDomainsList[i])) == keccak256(bytes(domain))) {
                    ownerDomainsList[i] = ownerDomainsList[ownerDomainsList.length - 1];
                    ownerDomainsList.pop();
                    break;
                }
            }
        }
        
        // Clear all domain data
        delete domains[domain];
        delete domainToTokenId[domain];
        delete tokenIdToDomain[tokenId];
        
        // Burn the NFT
        _burn(tokenId);
        
        emit DomainBurned(domain, tokenId, msg.sender);
    }
    
    /**
     * @dev Get domain owner (returns address(0) if expired)
     */
    function getDomainOwner(string calldata domain) public view returns (address) {
        if (!domains[domain].exists || isExpired(domain)) {
            return address(0);
        }
        uint256 tokenId = domainToTokenId[domain];
        return ownerOf(tokenId);
    }
    
    /**
     * @dev Get domains owned by an address
     */
    function getOwnerDomains(address domainOwner) 
        public 
        view 
        returns (string[] memory) 
    {
        return ownerDomains[domainOwner];
    }
    
    /**
     * @dev Get complete domain information
     */
    function getDomainInfo(string calldata domain) 
        public 
        view 
        returns (
            address domainOwner, 
            uint256 tokenId, 
            uint256 expirationTime, 
            bool exists
        ) 
    {
        Domain memory dom = domains[domain];
        tokenId = domainToTokenId[domain];
        
        if (dom.exists && !isExpired(domain)) {
            domainOwner = ownerOf(tokenId);
        } else {
            domainOwner = address(0);
        }
        
        return (domainOwner, tokenId, dom.expirationTime, dom.exists);
    }
    
    /**
     * @dev Override transfer to update owner domains tracking
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Update owner domains list when transferring
        if (from != address(0) && to != address(0) && from != to) {
            string memory domain = tokenIdToDomain[tokenId];
            
            // Add to new owner's list
            ownerDomains[to].push(domain);
            
            // Remove from old owner's list
            string[] storage oldOwnerDomainsList = ownerDomains[from];
            for (uint i = 0; i < oldOwnerDomainsList.length; i++) {
                if (keccak256(bytes(oldOwnerDomainsList[i])) == keccak256(bytes(domain))) {
                    oldOwnerDomainsList[i] = oldOwnerDomainsList[oldOwnerDomainsList.length - 1];
                    oldOwnerDomainsList.pop();
                    break;
                }
            }
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Override tokenURI to support both ERC721URIStorage and our implementation
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
     * @dev Set a domain as the primary domain for the caller
     * @param domain The domain name to set as primary (without .trust)
     */
    function setPrimaryDomain(string calldata domain) external validDomain(domain) {
        require(domains[domain].exists, "Domain does not exist");
        require(!isExpired(domain), "Domain has expired");
        
        uint256 tokenId = domainToTokenId[domain];
        require(ownerOf(tokenId) == msg.sender, "Not domain owner");
        
        // Set as primary domain
        primaryDomain[msg.sender] = domain;
        
        emit PrimaryDomainSet(msg.sender, domain);
    }
    
    /**
     * @dev Get the primary domain for an address
     * @param owner The address to query
     * @return The primary domain name (empty string if none set)
     */
    function getPrimaryDomain(address owner) external view returns (string memory) {
        return primaryDomain[owner];
    }
    
    /**
     * @dev Set the resolver contract for a domain
     * @param domain The domain name (without .trust)
     * @param resolverAddress The address of the resolver contract
     */
    function setResolver(string calldata domain, address resolverAddress) 
        external 
        validDomain(domain) 
    {
        require(domains[domain].exists, "Domain does not exist");
        require(!isExpired(domain), "Domain has expired");
        
        uint256 tokenId = domainToTokenId[domain];
        require(ownerOf(tokenId) == msg.sender, "Not domain owner");
        
        resolvers[domain] = resolverAddress;
        emit ResolverChanged(domain, resolverAddress);
    }
    
    /**
     * @dev Get the resolver contract for a domain
     * @param domain The domain name (without .trust)
     * @return The resolver contract address (address(0) if not set)
     */
    function resolver(string calldata domain) external view returns (address) {
        if (!domains[domain].exists || isExpired(domain)) {
            return address(0);
        }
        return resolvers[domain];
    }
    
    /**
     * @dev Withdraw contract funds (only owner, with reentrancy protection)
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // Use call instead of transfer for better compatibility
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Restricted receive function - revert on direct payments to prevent locked funds
     * @notice Only accept payments through register() or renew() functions
     */
    receive() external payable {
        revert("Direct payments not accepted. Use register() or renew()");
    }
}
