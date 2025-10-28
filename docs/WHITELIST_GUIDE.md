# TNS Whitelist Feature Guide

## Overview
The TNS whitelist feature allows the contract owner to grant free domain registrations to specific addresses. This is useful for promotions, early supporters, partnerships, or special events.

## Smart Contract

### Location
`contracts/TNSRegistryERC721_Whitelist.sol`

### Key Features
- **Free Registration**: Whitelisted addresses can register domains without paying TRUST tokens
- **Configurable Quotas**: Each address can have a different number of free mints
- **Automatic Deduction**: Free mints are consumed automatically during registration
- **Batch Support**: Add multiple addresses at once for efficiency

## How It Works

### For Users
1. **Check Status**: Users can verify their whitelist status and remaining free mints
2. **Normal Flow**: Whitelisted users follow the same 2-step commit-reveal process
3. **Free Registration**: Payment is skipped automatically if they have remaining free mints
4. **After Quota**: Once free mints are used up, users pay the normal price

### For Contract Owner
1. **Add to Whitelist**: Grant free mints to specific addresses
2. **Batch Addition**: Add multiple addresses efficiently
3. **Check Status**: Verify any address's whitelist status
4. **Remove**: Revoke whitelist access if needed

## Admin Interface

### Access
Navigate to `/admin` (only visible to contract owner in the header navigation)

### Features

#### 1. Add Single Address
- Input: Wallet address + number of free mints
- Use case: Individual rewards, partnerships
- Gas cost: ~50,000-70,000 gas

#### 2. Add Multiple Addresses (Batch)
- Input: List of addresses (newline or comma-separated) + free mints per address
- Use case: Airdrops, large promotions
- Gas cost: ~30,000-40,000 gas per address (more efficient than individual)

#### 3. Check Whitelist Status
- Input: Any wallet address
- Output: Number of remaining free mints
- No transaction required (read-only)

#### 4. Remove from Whitelist
- Input: Wallet address
- Effect: Removes all remaining free mints
- Use case: Revoke mistakenly granted access

## Smart Contract Functions

### Owner Functions

```solidity
// Add single address
function addToWhitelist(address account, uint256 freeMints) external onlyOwner

// Add multiple addresses with same quota
function addToWhitelistBatch(address[] calldata accounts, uint256 freeMints) external onlyOwner

// Remove address from whitelist
function removeFromWhitelist(address account) external onlyOwner
```

### Public View Functions

```solidity
// Check whitelist status for any address
function getWhitelistStatus(address account) external view returns (uint256)

// Check if caller is whitelisted
function isWhitelisted() public view returns (bool)

// Calculate cost (returns 0 for whitelisted users)
function calculateCost(string calldata domain, uint256 duration) public view returns (uint256)
```

### Events

```solidity
event WhitelistAdded(address indexed account, uint256 freeMints);
event WhitelistRemoved(address indexed account);
event WhitelistUsed(address indexed account, string indexed domain, uint256 remaining);
```

## Integration Steps

### 1. Deploy Contract
Deploy `TNSRegistryERC721_Whitelist.sol` instead of the standard contract:
```bash
# Deploy using Remix, Hardhat, or Foundry
# Save the deployed contract address
```

### 2. Update Contract Address
Update the contract address in your frontend:
```typescript
// client/src/lib/contracts.ts
export const TNS_REGISTRY_ADDRESS = "0xYourNewWhitelistContractAddress";

// Update ABI to include whitelist functions
```

### 3. Set Owner Address
Update the owner address in both files:
```typescript
// client/src/pages/admin.tsx
const CONTRACT_OWNER = "0xYourWalletAddress";

// client/src/components/layout/header.tsx
const CONTRACT_OWNER = "0xYourWalletAddress";
```

### 4. Add Web3 Functions
Implement the whitelist functions in `client/src/lib/web3.ts`:
```typescript
export const web3Service = {
  // Existing functions...
  
  async addToWhitelist(address: string, freeMints: number) {
    // Implementation
  },
  
  async addToWhitelistBatch(addresses: string[], freeMints: number) {
    // Implementation
  },
  
  async getWhitelistStatus(address: string): Promise<number> {
    // Implementation
  },
  
  async removeFromWhitelist(address: string) {
    // Implementation
  }
};
```

## Use Cases

### Promotional Campaign
```
1. Collect wallet addresses from campaign participants
2. Use batch addition to grant 1-3 free mints per address
3. Announce the promotion
4. Users register domains for free
```

### Early Supporter Rewards
```
1. Identify early supporters/testnet participants
2. Grant them 5-10 free mints as a reward
3. Free mints can be used over time
```

### Partnership Integration
```
1. Partner provides list of their community members
2. Batch whitelist with appropriate quotas
3. Partner promotes TNS to their community
4. Community members get free domains
```

### Special Events
```
1. Create limited-time whitelist for event attendees
2. Grant 1 free mint per attendee
3. Promote during event
4. Remove whitelist after event ends (optional)
```

## Security Considerations

### Access Control
- Only contract owner can manage whitelist
- Owner verification in both smart contract and frontend
- No way for non-owners to bypass access controls

### Gas Efficiency
- Batch operations save ~40% gas compared to individual
- Consider batching for >5 addresses
- Maximum batch size: limited by block gas limit (~10,000 addresses)

### Data Validation
- Contract validates address(0) checks
- Frontend validates address format
- Minimum 1 free mint required

## Monitoring

### Events to Track
- `WhitelistAdded`: Monitor who is being whitelisted
- `WhitelistUsed`: Track when free mints are consumed
- `WhitelistRemoved`: Log removals for audit trail

### Metrics to Monitor
- Total addresses whitelisted
- Total free mints distributed
- Total free mints consumed
- Conversion rate (whitelisted → registered)

## Best Practices

1. **Start Small**: Test with a few addresses first
2. **Batch Operations**: Use batch for >5 addresses
3. **Clear Communication**: Inform users about their free mints
4. **Time Limits**: Consider setting expiration dates manually
5. **Documentation**: Keep records of whitelist campaigns
6. **Monitoring**: Track usage and effectiveness
7. **Gas Optimization**: Batch during low gas periods

## Example Workflow

```typescript
// 1. Add addresses to whitelist
const addresses = [
  "0x123...",
  "0x456...",
  "0x789..."
];
await addToWhitelistBatch(addresses, 2); // 2 free mints each

// 2. Users check their status
const freeMints = await getWhitelistStatus("0x123...");
console.log(`You have ${freeMints} free registrations`);

// 3. User registers (automatically uses free mint)
await register("mydomain", 1, secret); // Cost = 0 TRUST

// 4. Check remaining after registration
const remaining = await getWhitelistStatus("0x123...");
console.log(`${remaining} free mints remaining`);
```

## Troubleshooting

### "Address not whitelisted"
- Check if address was correctly added
- Verify free mints > 0
- Confirm address format is correct

### "Not contract owner"
- Verify wallet connected is the owner
- Check owner address matches in contract
- Ensure proper permissions

### Transaction fails
- Check gas limits
- Verify address formats
- Ensure sufficient ETH for gas
- Try smaller batch sizes

## Future Enhancements

Potential features for future versions:
- Time-based expiration for whitelist entries
- Whitelist quotas for specific domain lengths
- Referral-based whitelist expansion
- Multi-tier whitelist levels
- Whitelist NFT/token-gating
