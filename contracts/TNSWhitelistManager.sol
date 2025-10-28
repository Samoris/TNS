// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TNS Whitelist Manager
 * @dev Manages whitelist for free domain minting on TNS Registry
 * @notice Allows admin to grant free domain mints to specific addresses
 */
contract TNSWhitelistManager is Ownable {
    
    // Events
    event WhitelistAdded(
        address indexed user,
        uint256 freeMintsAllowed
    );
    
    event WhitelistRemoved(
        address indexed user
    );
    
    event FreeMintUsed(
        address indexed user,
        string domain,
        uint256 remainingMints
    );
    
    // Whitelist entry structure
    struct WhitelistEntry {
        uint256 freeMintsAllowed;
        uint256 freeMintsUsed;
        bool isWhitelisted;
    }
    
    // Storage
    mapping(address => WhitelistEntry) public whitelist;
    address public registryContract;
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Set the registry contract address (can only be set once)
     */
    function setRegistryContract(address _registryContract) external onlyOwner {
        require(_registryContract != address(0), "Invalid registry address");
        require(registryContract == address(0), "Registry already set");
        registryContract = _registryContract;
    }
    
    /**
     * @dev Add an address to the whitelist with free mint allowance
     * @param user Address to whitelist
     * @param freeMintsAllowed Number of free domain mints allowed
     */
    function addToWhitelist(address user, uint256 freeMintsAllowed) external onlyOwner {
        require(user != address(0), "Invalid address");
        require(freeMintsAllowed > 0, "Must allow at least 1 free mint");
        
        whitelist[user] = WhitelistEntry({
            freeMintsAllowed: freeMintsAllowed,
            freeMintsUsed: 0,
            isWhitelisted: true
        });
        
        emit WhitelistAdded(user, freeMintsAllowed);
    }
    
    /**
     * @dev Add multiple addresses to whitelist in batch
     */
    function addToWhitelistBatch(
        address[] calldata users,
        uint256[] calldata freeMintsAllowed
    ) external onlyOwner {
        require(users.length == freeMintsAllowed.length, "Array length mismatch");
        require(users.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid address");
            require(freeMintsAllowed[i] > 0, "Must allow at least 1 free mint");
            
            whitelist[users[i]] = WhitelistEntry({
                freeMintsAllowed: freeMintsAllowed[i],
                freeMintsUsed: 0,
                isWhitelisted: true
            });
            
            emit WhitelistAdded(users[i], freeMintsAllowed[i]);
        }
    }
    
    /**
     * @dev Remove an address from the whitelist
     */
    function removeFromWhitelist(address user) external onlyOwner {
        require(whitelist[user].isWhitelisted, "User not whitelisted");
        delete whitelist[user];
        emit WhitelistRemoved(user);
    }
    
    /**
     * @dev Update free mints allowance for a whitelisted user
     */
    function updateWhitelistAllowance(address user, uint256 newAllowance) external onlyOwner {
        require(whitelist[user].isWhitelisted, "User not whitelisted");
        require(newAllowance > 0, "Must allow at least 1 free mint");
        
        whitelist[user].freeMintsAllowed = newAllowance;
        emit WhitelistAdded(user, newAllowance);
    }
    
    /**
     * @dev Check if a user can mint for free
     * @return canMintFree True if user has free mints remaining
     * @return remainingMints Number of free mints remaining
     */
    function canMintFree(address user) external view returns (bool canMintFree, uint256 remainingMints) {
        WhitelistEntry memory entry = whitelist[user];
        
        if (!entry.isWhitelisted) {
            return (false, 0);
        }
        
        if (entry.freeMintsUsed >= entry.freeMintsAllowed) {
            return (false, 0);
        }
        
        remainingMints = entry.freeMintsAllowed - entry.freeMintsUsed;
        return (true, remainingMints);
    }
    
    /**
     * @dev Use a free mint (called by registry contract)
     * @param user Address using the free mint
     * @param domain Domain being registered
     */
    function useFreeMint(address user, string calldata domain) external {
        require(msg.sender == registryContract, "Only registry can call");
        require(whitelist[user].isWhitelisted, "User not whitelisted");
        require(
            whitelist[user].freeMintsUsed < whitelist[user].freeMintsAllowed,
            "No free mints remaining"
        );
        
        whitelist[user].freeMintsUsed++;
        
        uint256 remaining = whitelist[user].freeMintsAllowed - whitelist[user].freeMintsUsed;
        emit FreeMintUsed(user, domain, remaining);
    }
    
    /**
     * @dev Get complete whitelist info for a user
     */
    function getWhitelistInfo(address user) external view returns (
        bool isWhitelisted,
        uint256 freeMintsAllowed,
        uint256 freeMintsUsed,
        uint256 freeMintsRemaining
    ) {
        WhitelistEntry memory entry = whitelist[user];
        isWhitelisted = entry.isWhitelisted;
        freeMintsAllowed = entry.freeMintsAllowed;
        freeMintsUsed = entry.freeMintsUsed;
        freeMintsRemaining = entry.isWhitelisted && entry.freeMintsUsed < entry.freeMintsAllowed 
            ? entry.freeMintsAllowed - entry.freeMintsUsed 
            : 0;
    }
    
    /**
     * @dev Get all whitelisted addresses (view only, for admin UI)
     * @notice This is gas-intensive, only for off-chain queries
     */
    function isUserWhitelisted(address user) external view returns (bool) {
        return whitelist[user].isWhitelisted;
    }
}
