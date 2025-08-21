// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TNS Registry
 * @dev ERC721 contract for .trust domain names
 */
contract TNSRegistry is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Domain name to token ID mapping
    mapping(string => uint256) public domainToTokenId;
    // Token ID to domain name mapping
    mapping(uint256 => string) public tokenIdToDomain;
    // Domain name to expiration timestamp
    mapping(string => uint256) public domainExpiration;
    // Domain name to resolver address
    mapping(string => address) public domainResolver;
    
    // Pricing tiers (in wei)
    uint256 public constant PRICE_3_CHARS = 2 ether;    // 2 TRUST/year
    uint256 public constant PRICE_4_CHARS = 0.1 ether;  // 0.1 TRUST/year  
    uint256 public constant PRICE_5_PLUS = 0.02 ether;  // 0.02 TRUST/year
    
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
    
    constructor() ERC721("Trust Name Service", "TNS") {}
    
    /**
     * @dev Calculate registration cost for a domain
     */
    function calculateCost(string memory domain, uint256 duration) public pure returns (uint256) {
        bytes memory domainBytes = bytes(domain);
        uint256 pricePerYear;
        
        if (domainBytes.length == 3) {
            pricePerYear = PRICE_3_CHARS;
        } else if (domainBytes.length == 4) {
            pricePerYear = PRICE_4_CHARS;
        } else {
            pricePerYear = PRICE_5_PLUS;
        }
        
        return pricePerYear * duration;
    }
    
    /**
     * @dev Register a new domain
     */
    function register(string memory domain, uint256 duration) external payable {
        require(bytes(domain).length >= 3, "Domain too short");
        require(duration > 0 && duration <= 10, "Invalid duration");
        require(domainToTokenId[domain] == 0 || isExpired(domain), "Domain not available");
        
        uint256 cost = calculateCost(domain, duration);
        require(msg.value >= cost, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // If domain exists but expired, burn the old token
        if (domainToTokenId[domain] != 0) {
            _burn(domainToTokenId[domain]);
        }
        
        // Mint new NFT
        _safeMint(msg.sender, tokenId);
        
        // Store domain data
        domainToTokenId[domain] = tokenId;
        tokenIdToDomain[tokenId] = domain;
        domainExpiration[domain] = block.timestamp + (duration * 365 days);
        
        emit DomainRegistered(domain, msg.sender, tokenId, domainExpiration[domain]);
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }
    
    /**
     * @dev Renew an existing domain
     */
    function renew(string memory domain, uint256 duration) external payable {
        require(domainToTokenId[domain] != 0, "Domain not registered");
        require(!isExpired(domain), "Domain expired, must re-register");
        require(duration > 0 && duration <= 10, "Invalid duration");
        
        uint256 cost = calculateCost(domain, duration);
        require(msg.value >= cost, "Insufficient payment");
        
        uint256 tokenId = domainToTokenId[domain];
        domainExpiration[domain] += (duration * 365 days);
        
        emit DomainRenewed(domain, tokenId, domainExpiration[domain]);
        
        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }
    
    /**
     * @dev Check if a domain is expired
     */
    function isExpired(string memory domain) public view returns (bool) {
        return block.timestamp > domainExpiration[domain];
    }
    
    /**
     * @dev Check if a domain is available for registration
     */
    function isAvailable(string memory domain) public view returns (bool) {
        return domainToTokenId[domain] == 0 || isExpired(domain);
    }
    
    /**
     * @dev Get domain owner
     */
    function getDomainOwner(string memory domain) public view returns (address) {
        uint256 tokenId = domainToTokenId[domain];
        if (tokenId == 0 || isExpired(domain)) {
            return address(0);
        }
        return ownerOf(tokenId);
    }
    
    /**
     * @dev Set resolver for a domain
     */
    function setResolver(string memory domain, address resolver) external {
        uint256 tokenId = domainToTokenId[domain];
        require(tokenId != 0 && !isExpired(domain), "Domain not available");
        require(ownerOf(tokenId) == msg.sender, "Not domain owner");
        
        domainResolver[domain] = resolver;
    }
    
    /**
     * @dev Withdraw contract funds (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Override tokenURI to return domain-based metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        string memory domain = tokenIdToDomain[tokenId];
        return string(abi.encodePacked(
            "data:application/json,{",
            '"name":"', domain, '.trust",',
            '"description":"Trust Name Service domain NFT",',
            '"image":"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzAwMzM2NiIvPjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+", domain, '.trust</text></svg>",',
            '"attributes":[',
            '{"trait_type":"Domain","value":"', domain, '"},',
            '{"trait_type":"Extension","value":".trust"},',
            '{"trait_type":"Length","value":', _toString(bytes(domain).length), '},',
            '{"trait_type":"Expiration","value":', _toString(domainExpiration[domain]), '}',
            ']}'
        ));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}