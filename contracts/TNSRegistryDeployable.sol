// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TNS Registry - Deployable Contract
 * @dev Gas-efficient domain registration contract for .trust domains
 * @notice Ready for deployment on Intuition testnet
 */
contract TNSRegistry {
    
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
    
    // Contract owner
    address public owner;
    
    // Domain data structure
    struct Domain {
        address owner;
        uint256 tokenId;
        uint256 expirationTime;
        bool exists;
    }
    
    // Storage mappings
    mapping(string => Domain) public domains;
    mapping(address => string[]) public ownerDomains;
    mapping(uint256 => string) public tokenIdToDomain;
    
    // Token ID counter
    uint256 private _nextTokenId = 1;
    
    // Pricing constants (in wei)
    uint256 public constant PRICE_3_CHARS = 2 ether;    // 2 TRUST/year
    uint256 public constant PRICE_4_CHARS = 0.1 ether;  // 0.1 TRUST/year  
    uint256 public constant PRICE_5_PLUS = 0.02 ether;  // 0.02 TRUST/year
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier validDomain(string calldata domain) {
        require(bytes(domain).length >= 3, "Domain too short");
        require(bytes(domain).length <= 63, "Domain too long");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Calculate registration cost for a domain
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
     * @dev Register a new domain
     */
    function register(string calldata domain, uint256 duration) 
        external 
        payable 
        validDomain(domain) 
    {
        require(duration > 0 && duration <= 10, "Invalid duration");
        require(!domains[domain].exists || isExpired(domain), "Domain not available");
        
        uint256 cost = calculateCost(domain, duration);
        require(msg.value >= cost, "Insufficient payment");
        
        uint256 tokenId = _nextTokenId++;
        uint256 expirationTime = block.timestamp + (duration * 365 days);
        
        // Store domain data
        domains[domain] = Domain({
            owner: msg.sender,
            tokenId: tokenId,
            expirationTime: expirationTime,
            exists: true
        });
        
        // Add to owner's domain list
        ownerDomains[msg.sender].push(domain);
        tokenIdToDomain[tokenId] = domain;
        
        emit DomainRegistered(domain, msg.sender, tokenId, expirationTime);
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }
    
    /**
     * @dev Renew an existing domain
     */
    function renew(string calldata domain, uint256 duration) 
        external 
        payable 
    {
        require(domains[domain].exists, "Domain not registered");
        require(!isExpired(domain), "Domain expired, must re-register");
        require(domains[domain].owner == msg.sender, "Not domain owner");
        require(duration > 0 && duration <= 10, "Invalid duration");
        
        uint256 cost = calculateCost(domain, duration);
        require(msg.value >= cost, "Insufficient payment");
        
        uint256 tokenId = domains[domain].tokenId;
        domains[domain].expirationTime += (duration * 365 days);
        
        emit DomainRenewed(domain, tokenId, domains[domain].expirationTime);
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }
    
    /**
     * @dev Check if a domain is expired
     */
    function isExpired(string calldata domain) public view returns (bool) {
        if (!domains[domain].exists) return false;
        return block.timestamp > domains[domain].expirationTime;
    }
    
    /**
     * @dev Check if a domain is available for registration
     */
    function isAvailable(string calldata domain) public view returns (bool) {
        return !domains[domain].exists || isExpired(domain);
    }
    
    /**
     * @dev Get domain owner
     */
    function getDomainOwner(string calldata domain) public view returns (address) {
        if (!domains[domain].exists || isExpired(domain)) {
            return address(0);
        }
        return domains[domain].owner;
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
        return (dom.owner, dom.tokenId, dom.expirationTime, dom.exists);
    }
    
    /**
     * @dev Transfer domain ownership
     */
    function transferDomain(string calldata domain, address newOwner) 
        external 
    {
        require(domains[domain].exists, "Domain not registered");
        require(!isExpired(domain), "Domain expired");
        require(domains[domain].owner == msg.sender, "Not domain owner");
        require(newOwner != address(0), "Invalid new owner");
        
        // Update ownership
        domains[domain].owner = newOwner;
        
        // Add to new owner's list
        ownerDomains[newOwner].push(domain);
        
        // Remove from old owner's list (simplified - in production use more efficient removal)
        string[] storage oldOwnerDomains = ownerDomains[msg.sender];
        for (uint i = 0; i < oldOwnerDomains.length; i++) {
            if (keccak256(bytes(oldOwnerDomains[i])) == keccak256(bytes(domain))) {
                oldOwnerDomains[i] = oldOwnerDomains[oldOwnerDomains.length - 1];
                oldOwnerDomains.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Withdraw contract funds (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency function to update pricing (only owner)
     */
    function updateOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}