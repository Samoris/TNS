// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TNS Registry - Full ERC721 NFT Implementation
 * @dev Domain registration contract that mints actual ERC-721 NFTs for .trust domains
 * @notice Each registered domain is a real NFT that can be transferred and traded
 */
contract TNSRegistryERC721 is ERC721, ERC721URIStorage, Ownable {
    
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
    
    // Token ID counter
    uint256 private _nextTokenId = 1;
    
    // Pricing constants (in wei)
    uint256 public constant PRICE_3_CHARS = 2 ether;    // 2 TRUST/year
    uint256 public constant PRICE_4_CHARS = 0.1 ether;  // 0.1 TRUST/year  
    uint256 public constant PRICE_5_PLUS = 0.02 ether;  // 0.02 TRUST/year
    
    modifier validDomain(string calldata domain) {
        require(bytes(domain).length >= 3, "Domain too short");
        require(bytes(domain).length <= 63, "Domain too long");
        _;
    }
    
    constructor() ERC721("Trust Name Service", "TNS") Ownable(msg.sender) {}
    
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
     * @dev Register a new domain and mint an ERC-721 NFT
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
            name: domain,
            expirationTime: expirationTime,
            exists: true
        });
        
        domainToTokenId[domain] = tokenId;
        tokenIdToDomain[tokenId] = domain;
        ownerDomains[msg.sender].push(domain);
        
        // MINT THE ACTUAL ERC-721 NFT
        _safeMint(msg.sender, tokenId);
        
        // Set token URI to the domain name
        _setTokenURI(tokenId, string(abi.encodePacked(domain, ".trust")));
        
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
        
        uint256 tokenId = domainToTokenId[domain];
        require(ownerOf(tokenId) == msg.sender, "Not domain owner");
        require(duration > 0 && duration <= 10, "Invalid duration");
        
        uint256 cost = calculateCost(domain, duration);
        require(msg.value >= cost, "Insufficient payment");
        
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
     * @dev Withdraw contract funds (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Fallback function to handle direct payments
     */
    receive() external payable {}
}
