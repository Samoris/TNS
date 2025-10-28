// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TNS Whitelist Tracker
 * @dev Standalone whitelist tracking for existing TNS Registry
 * @notice Works with existing registry - tracks whitelisted users for manual refunds
 * @notice Deploy this separately, use for admin tracking only
 */
contract TNSWhitelistTracker is Ownable {
    
    // Events
    event WhitelistAdded(address indexed user, uint256 allowedMints, string note);
    event WhitelistRemoved(address indexed user);
    event WhitelistUpdated(address indexed user, uint256 newAllowedMints);
    event MintRecorded(address indexed user, string domain, uint256 remainingMints);
    
    // Whitelist entry
    struct WhitelistEntry {
        uint256 allowedMints;    // Total free mints allowed
        uint256 usedMints;       // Mints recorded
        bool isActive;           // Active status
        string note;             // Optional note (e.g., "Early supporter")
    }
    
    // Storage
    mapping(address => WhitelistEntry) public whitelist;
    address[] public whitelistedAddresses;
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Add user to whitelist
     */
    function addToWhitelist(address user, uint256 allowedMints, string calldata note) 
        external 
        onlyOwner 
    {
        require(user != address(0), "Invalid address");
        require(allowedMints > 0, "Must allow at least 1 mint");
        
        if (!whitelist[user].isActive) {
            whitelistedAddresses.push(user);
        }
        
        whitelist[user] = WhitelistEntry({
            allowedMints: allowedMints,
            usedMints: 0,
            isActive: true,
            note: note
        });
        
        emit WhitelistAdded(user, allowedMints, note);
    }
    
    /**
     * @dev Batch add users to whitelist
     */
    function batchAddToWhitelist(
        address[] calldata users, 
        uint256 allowedMints,
        string calldata note
    ) 
        external 
        onlyOwner 
    {
        require(allowedMints > 0, "Must allow at least 1 mint");
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (user == address(0)) continue;
            
            if (!whitelist[user].isActive) {
                whitelistedAddresses.push(user);
            }
            
            whitelist[user] = WhitelistEntry({
                allowedMints: allowedMints,
                usedMints: 0,
                isActive: true,
                note: note
            });
            
            emit WhitelistAdded(user, allowedMints, note);
        }
    }
    
    /**
     * @dev Remove user from whitelist
     */
    function removeFromWhitelist(address user) external onlyOwner {
        require(whitelist[user].isActive, "Not whitelisted");
        whitelist[user].isActive = false;
        emit WhitelistRemoved(user);
    }
    
    /**
     * @dev Update user's mint allowance
     */
    function updateAllowance(address user, uint256 newAllowedMints) external onlyOwner {
        require(whitelist[user].isActive, "Not whitelisted");
        require(newAllowedMints >= whitelist[user].usedMints, "Cannot be less than used");
        
        whitelist[user].allowedMints = newAllowedMints;
        emit WhitelistUpdated(user, newAllowedMints);
    }
    
    /**
     * @dev Record a mint (manual tracking by admin)
     */
    function recordMint(address user, string calldata domain) external onlyOwner {
        require(whitelist[user].isActive, "Not whitelisted");
        require(whitelist[user].usedMints < whitelist[user].allowedMints, "No mints remaining");
        
        whitelist[user].usedMints++;
        
        uint256 remaining = whitelist[user].allowedMints - whitelist[user].usedMints;
        emit MintRecorded(user, domain, remaining);
    }
    
    /**
     * @dev Check if user can get free mint
     */
    function canMintFree(address user) 
        external 
        view 
        returns (bool eligible, uint256 remainingMints, string memory note) 
    {
        WhitelistEntry memory entry = whitelist[user];
        
        if (!entry.isActive) {
            return (false, 0, "");
        }
        
        if (entry.usedMints >= entry.allowedMints) {
            return (false, 0, entry.note);
        }
        
        remainingMints = entry.allowedMints - entry.usedMints;
        return (true, remainingMints, entry.note);
    }
    
    /**
     * @dev Get whitelist status
     */
    function getWhitelistInfo(address user) 
        external 
        view 
        returns (
            bool isActive,
            uint256 allowedMints,
            uint256 usedMints,
            uint256 remainingMints,
            string memory note
        ) 
    {
        WhitelistEntry memory entry = whitelist[user];
        
        remainingMints = entry.isActive && entry.usedMints < entry.allowedMints
            ? entry.allowedMints - entry.usedMints
            : 0;
        
        return (
            entry.isActive,
            entry.allowedMints,
            entry.usedMints,
            remainingMints,
            entry.note
        );
    }
    
    /**
     * @dev Get all whitelisted addresses
     */
    function getAllWhitelisted() external view returns (address[] memory) {
        return whitelistedAddresses;
    }
    
    /**
     * @dev Get total whitelisted count
     */
    function getWhitelistCount() external view returns (uint256) {
        return whitelistedAddresses.length;
    }
    
    /**
     * @dev Check if address is whitelisted
     */
    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user].isActive;
    }
}
