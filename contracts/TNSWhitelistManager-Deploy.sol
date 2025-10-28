// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TNS Whitelist Manager
 * @dev Manages whitelist entries for free domain minting (5+ characters only)
 * @notice Deploy this contract first, then link it to TNSRegistryERC721
 * @notice DEPLOYMENT VERSION - Ready for Remix deployment
 */
contract TNSWhitelistManager is Ownable {
    
    // Events
    event WhitelistAdded(address indexed user, uint256 allowance);
    event WhitelistRemoved(address indexed user);
    event WhitelistUpdated(address indexed user, uint256 newAllowance);
    event FreeMintUsed(address indexed user, string indexed domain, uint256 remainingMints);
    
    // Whitelist data structure
    struct WhitelistEntry {
        uint256 allowedMints;    // Total allowed free mints
        uint256 usedMints;       // Number of free mints used
        bool isWhitelisted;      // Active status
    }
    
    // Storage
    mapping(address => WhitelistEntry) private whitelist;
    address[] private whitelistedAddresses;
    
    /**
     * @dev Constructor - Initialize with deployer as owner
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Add address to whitelist with specified number of free mints
     * @param user Address to whitelist
     * @param allowedMints Number of free domain mints allowed
     */
    function addToWhitelist(address user, uint256 allowedMints) external onlyOwner {
        require(user != address(0), "Invalid address");
        require(allowedMints > 0, "Allowance must be > 0");
        require(!whitelist[user].isWhitelisted, "Already whitelisted");
        
        whitelist[user] = WhitelistEntry({
            allowedMints: allowedMints,
            usedMints: 0,
            isWhitelisted: true
        });
        
        whitelistedAddresses.push(user);
        
        emit WhitelistAdded(user, allowedMints);
    }
    
    /**
     * @dev Add multiple addresses to whitelist (batch operation)
     * @param users Array of addresses to whitelist
     * @param allowedMints Number of free mints for each address
     */
    function batchAddToWhitelist(address[] calldata users, uint256 allowedMints) external onlyOwner {
        require(allowedMints > 0, "Allowance must be > 0");
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            
            if (user == address(0)) continue;
            if (whitelist[user].isWhitelisted) continue;
            
            whitelist[user] = WhitelistEntry({
                allowedMints: allowedMints,
                usedMints: 0,
                isWhitelisted: true
            });
            
            whitelistedAddresses.push(user);
            
            emit WhitelistAdded(user, allowedMints);
        }
    }
    
    /**
     * @dev Remove address from whitelist
     * @param user Address to remove
     */
    function removeFromWhitelist(address user) external onlyOwner {
        require(whitelist[user].isWhitelisted, "Not whitelisted");
        
        whitelist[user].isWhitelisted = false;
        
        emit WhitelistRemoved(user);
    }
    
    /**
     * @dev Update whitelist allowance for an address
     * @param user Address to update
     * @param newAllowance New total allowance (not additional)
     */
    function updateWhitelistAllowance(address user, uint256 newAllowance) external onlyOwner {
        require(whitelist[user].isWhitelisted, "Not whitelisted");
        require(newAllowance >= whitelist[user].usedMints, "Allowance < used mints");
        
        whitelist[user].allowedMints = newAllowance;
        
        emit WhitelistUpdated(user, newAllowance);
    }
    
    /**
     * @dev Check if address can mint for free
     * @param user Address to check
     * @return canMintFree True if user can mint for free
     * @return remainingMints Number of free mints remaining
     */
    function canMintFree(address user) external view returns (bool canMintFree, uint256 remainingMints) {
        WhitelistEntry memory entry = whitelist[user];
        
        if (!entry.isWhitelisted) {
            return (false, 0);
        }
        
        if (entry.usedMints >= entry.allowedMints) {
            return (false, 0);
        }
        
        remainingMints = entry.allowedMints - entry.usedMints;
        return (true, remainingMints);
    }
    
    /**
     * @dev Use a free mint (called by registry contract)
     * @param user Address using the free mint
     * @param domain Domain being registered
     */
    function useFreeMint(address user, string calldata domain) external {
        WhitelistEntry storage entry = whitelist[user];
        
        require(entry.isWhitelisted, "Not whitelisted");
        require(entry.usedMints < entry.allowedMints, "No free mints remaining");
        
        entry.usedMints++;
        
        uint256 remaining = entry.allowedMints - entry.usedMints;
        emit FreeMintUsed(user, domain, remaining);
    }
    
    /**
     * @dev Get whitelist status for an address
     * @param user Address to check
     * @return isWhitelisted Whether address is whitelisted
     * @return allowedMints Total mints allowed
     * @return usedMints Mints already used
     * @return remainingMints Mints remaining
     */
    function getWhitelistStatus(address user) 
        external 
        view 
        returns (
            bool isWhitelisted,
            uint256 allowedMints,
            uint256 usedMints,
            uint256 remainingMints
        ) 
    {
        WhitelistEntry memory entry = whitelist[user];
        
        remainingMints = entry.isWhitelisted && entry.usedMints < entry.allowedMints
            ? entry.allowedMints - entry.usedMints
            : 0;
        
        return (
            entry.isWhitelisted,
            entry.allowedMints,
            entry.usedMints,
            remainingMints
        );
    }
    
    /**
     * @dev Get all whitelisted addresses
     * @return Array of whitelisted addresses
     */
    function getWhitelistedAddresses() external view returns (address[] memory) {
        return whitelistedAddresses;
    }
    
    /**
     * @dev Get total number of whitelisted addresses
     * @return Count of whitelisted addresses
     */
    function getWhitelistCount() external view returns (uint256) {
        return whitelistedAddresses.length;
    }
    
    /**
     * @dev Check if address is whitelisted
     * @param user Address to check
     * @return True if whitelisted and active
     */
    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user].isWhitelisted;
    }
}
