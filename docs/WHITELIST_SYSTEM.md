# TNS Whitelist System Documentation

## Overview

The TNS Whitelist System allows administrators to grant free domain minting privileges to specific addresses. This is implemented through two separate contracts:

1. **TNSRegistryERC721** - Main registry contract (current/existing)
2. **TNSWhitelistManager** - New whitelist management contract

## Architecture

### Separation of Concerns

- **Registry Contract**: Handles domain registration, NFT minting, and business logic
- **Whitelist Contract**: Manages whitelist entries and tracks free mint usage
- **Integration**: Registry checks whitelist before charging for registrations

### Benefits

✅ **Modular Design** - Whitelist can be upgraded without touching registry  
✅ **Clean Separation** - Registry logic remains unchanged  
✅ **Flexible Management** - Easy to add/remove whitelist entries  
✅ **Gas Efficient** - Only checks whitelist when contract is set  

## Smart Contracts

### 1. TNSWhitelistManager.sol

**Purpose**: Manage whitelist entries and track free mint usage

**Key Functions**:

```solidity
// Add single address to whitelist
function addToWhitelist(address user, uint256 freeMintsAllowed) external onlyOwner

// Add multiple addresses in batch
function addToWhitelistBatch(
    address[] calldata users,
    uint256[] calldata freeMintsAllowed
) external onlyOwner

// Remove from whitelist
function removeFromWhitelist(address user) external onlyOwner

// Update allowance
function updateWhitelistAllowance(address user, uint256 newAllowance) external onlyOwner

// Check eligibility
function canMintFree(address user) external view returns (bool, uint256)

// Get detailed info
function getWhitelistInfo(address user) external view returns (
    bool isWhitelisted,
    uint256 freeMintsAllowed,
    uint256 freeMintsUsed,
    uint256 freeMintsRemaining
)

// Called by registry to use a free mint
function useFreeMint(address user, string calldata domain) external
```

**Security**:
- Only owner can manage whitelist
- Only registry contract can call `useFreeMint()`
- Registry address can only be set once

### 2. TNSRegistryERC721.sol (Modified)

**Changes Made**:

```solidity
// Added interface
interface IWhitelistManager {
    function canMintFree(address user) external view returns (bool, uint256);
    function useFreeMint(address user, string calldata domain) external;
}

// Added storage
IWhitelistManager public whitelistManager;

// Added admin function
function setWhitelistManager(address _whitelistManager) external onlyOwner

// Modified register() function
// Now checks whitelist before charging
```

**Registration Logic**:

1. User calls `register(domain, duration, secret)`
2. Registry checks if whitelist contract is set
3. If set, calls `whitelistManager.canMintFree(msg.sender)`
4. If user has free mints:
   - Calls `whitelistManager.useFreeMint()`
   - Refunds any payment sent
   - Mints domain for free
5. If no free mints:
   - Requires payment as normal
   - Continues with paid registration

## Deployment Guide

### Step 1: Deploy Whitelist Manager

```solidity
// Deploy TNSWhitelistManager.sol
TNSWhitelistManager whitelistManager = new TNSWhitelistManager();
```

**Result**: Get whitelist contract address (e.g., `0x123...`)

### Step 2: Deploy/Update Registry

**Option A: New Deployment**
```solidity
// Deploy TNSRegistryERC721.sol (with whitelist support)
TNSRegistryERC721 registry = new TNSRegistryERC721();
```

**Option B: Use Existing Contract**
- Current contract at `0xdfe1aB8532925de628C419B65B41f23997c34B4a` already supports whitelist
- No redeployment needed!

### Step 3: Link Contracts

```solidity
// Connect whitelist to registry (on whitelist contract)
whitelistManager.setRegistryContract(REGISTRY_ADDRESS);

// Connect registry to whitelist (on registry contract)
registry.setWhitelistManager(WHITELIST_MANAGER_ADDRESS);
```

### Step 4: Add Whitelist Entries

```solidity
// Single address
whitelistManager.addToWhitelist(
    0xUserAddress,
    5  // 5 free mints
);

// Batch
address[] memory users = [0xUser1, 0xUser2, 0xUser3];
uint256[] memory quotas = [5, 10, 3];
whitelistManager.addToWhitelistBatch(users, quotas);
```

## Admin Interface

### Update Frontend Configuration

Edit `client/src/lib/contracts.ts`:

```typescript
// Add whitelist contract
export const WHITELIST_MANAGER_ADDRESS = "0xYourWhitelistAddress";

// Whitelist Manager ABI
export const WHITELIST_MANAGER_ABI = [
  "function addToWhitelist(address user, uint256 freeMintsAllowed)",
  "function removeFromWhitelist(address user)",
  "function getWhitelistInfo(address user) view returns (bool, uint256, uint256, uint256)",
  "function canMintFree(address user) view returns (bool, uint256)"
];
```

### Admin Panel Features

The admin panel (`/admin`) will need updates to:

1. ✅ Display whitelist contract status
2. ✅ Add addresses to whitelist
3. ✅ Remove addresses from whitelist
4. ✅ View whitelist entries and usage
5. ✅ Batch whitelist operations

## User Experience

### For Whitelisted Users

1. User makes commitment (same process)
2. User calls `register()` with payment (optional)
3. Contract checks whitelist automatically
4. If whitelisted with free mints remaining:
   - ✅ Domain minted for FREE
   - ✅ Any payment sent is refunded
   - ✅ Free mint quota decreased by 1
5. Registration completes as NFT mint

### For Non-Whitelisted Users

- Registration works exactly as before
- Payment required
- No changes to user experience

## Testing Checklist

- [ ] Deploy whitelist contract
- [ ] Link whitelist to registry
- [ ] Add test address to whitelist
- [ ] Verify `canMintFree()` returns true
- [ ] Test free registration (should succeed without payment)
- [ ] Verify quota decreased
- [ ] Test paid registration (after quota exhausted)
- [ ] Test whitelist removal
- [ ] Test batch operations

## Gas Costs

| Operation | Estimated Gas |
|-----------|---------------|
| Add to whitelist (single) | ~50,000 |
| Add to whitelist (batch of 10) | ~350,000 |
| Remove from whitelist | ~30,000 |
| Free registration (first time) | ~250,000 |
| Free registration (subsequent) | ~200,000 |
| Paid registration (no change) | ~220,000 |

## Security Considerations

1. **Access Control**
   - Only owner can manage whitelist
   - Only registry can consume free mints
   
2. **Reentrancy Protection**
   - Registry has ReentrancyGuard on register()
   - Whitelist updates are atomic

3. **Validation**
   - Registry checks whitelist before charging
   - Whitelist validates before decrementing quota
   - All addresses validated as non-zero

4. **Upgrade Path**
   - Whitelist contract can be replaced
   - Call `setWhitelistManager()` with new address
   - Old whitelist data is preserved separately

## Example Usage

### Whitelist for Campaign

```solidity
// Add 100 early adopters with 1 free mint each
address[] memory earlyAdopters = loadAddresses();
uint256[] memory quotas = new uint256[](100);
for (uint i = 0; i < 100; i++) {
    quotas[i] = 1;
}
whitelistManager.addToWhitelistBatch(earlyAdopters, quotas);
```

### VIP Whitelist

```solidity
// Grant VIP users unlimited testing
whitelistManager.addToWhitelist(vipAddress, 999);
```

### Remove After Use

```solidity
// Remove user after they've used their free mints
whitelistManager.removeFromWhitelist(userAddress);
```

## Events

### Whitelist Events

```solidity
event WhitelistAdded(address indexed user, uint256 freeMintsAllowed);
event WhitelistRemoved(address indexed user);
event FreeMintUsed(address indexed user, string domain, uint256 remainingMints);
```

### Tracking Usage

Query `FreeMintUsed` events to see:
- Who used free mints
- Which domains were registered for free
- How many free mints remain

## FAQ

**Q: Can I change the registry contract address?**  
A: No, for security the registry address can only be set once.

**Q: What happens if I remove someone from the whitelist mid-campaign?**  
A: They immediately lose free mint privileges. Any remaining quota is lost.

**Q: Can whitelisted users still pay for registration?**  
A: Yes, if they send payment it will be automatically refunded.

**Q: Can I increase someone's quota after they've used some?**  
A: Yes, use `updateWhitelistAllowance()` to set a new total allowance.

**Q: Does the whitelist affect renewals?**  
A: No, whitelist only applies to new domain registrations, not renewals.

## Support

For questions or issues:
- Check contract events for debugging
- Verify both contracts are properly linked
- Ensure owner wallet is connected for admin operations
