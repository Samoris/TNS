# Burning Expired Domain NFTs

## Overview

The TNS system includes a burn function that allows **anyone** to clean up expired domain NFTs. When a domain expires, its NFT can be burned to permanently remove it from the blockchain and make the domain name available for re-registration.

## How It Works

### Contract Function

```solidity
function burnExpiredDomain(string calldata domain) 
    external 
    nonReentrant 
    validDomain(domain)
```

**Key Features:**
- **Permissionless**: Anyone can call this function (not just the owner)
- **Validation**: Only works on expired domains
- **Cleanup**: Completely removes domain data and burns the NFT
- **Gas Efficient**: Uses reentrancy guard for security

### What Gets Burned

When a domain is burned, the following data is permanently deleted:

1. **NFT Token**: The ERC-721 token is burned using OpenZeppelin's `_burn()`
2. **Domain Record**: The domain struct is deleted from storage
3. **Mappings**: All domain-to-token and token-to-domain mappings are cleared
4. **Owner List**: Domain is removed from previous owner's domain list

### Why Allow Anyone to Burn?

The permissionless burn design has several benefits:

1. **Domain Cleanup**: Expired domains are cleaned up, keeping the registry tidy
2. **Gas Incentive**: Users can burn expired domains to free up storage and potentially earn from reduced state
3. **Fair Re-registration**: Anyone can clear expired domains to make them available again
4. **No Squatting**: Prevents previous owners from holding expired domains indefinitely

## Security Considerations

### Validations

The burn function includes multiple safety checks:

1. **Domain Exists**: `require(domains[domain].exists, "Domain not registered")`
2. **Domain Expired**: `require(isExpired(domain), "Domain not expired")`
3. **Valid Domain Format**: Uses `validDomain` modifier (3-63 characters)
4. **Reentrancy Protection**: `nonReentrant` modifier prevents recursive calls

### Safe for Previous Owners

- Cannot burn active (non-expired) domains
- Previous owner can renew before expiration to prevent burning
- Once burned, domain is completely removed and can be re-registered by anyone

## User Interface

### Manage Page

On the domain management page, expired domains show a "Burn NFT" button:

**Visual Indicators:**
- Red "Expired" badge on domain card
- Red outlined "Burn NFT" button with flame icon
- Button disabled during transaction
- Success toast shows transaction hash

**User Flow:**
1. User sees expired domain in their list
2. Clicks "Burn NFT" button (🔥 Flame icon)
3. MetaMask prompts for gas approval
4. Transaction is sent to blockchain
5. Success toast appears with transaction hash
6. Domain disappears from list (cache refreshed)
7. Domain name becomes available for re-registration

### Code Example

```typescript
// Burn an expired domain
const txHash = await web3Service.burnExpiredDomain(
  TNS_REGISTRY_ADDRESS,
  TNS_REGISTRY_ABI,
  "example.trust"
);
```

## Gas Costs

Approximate gas usage for burning:

- **Gas Limit**: 200,000
- **Actual Usage**: ~100,000-150,000 (varies by storage cleanup)
- **Cost**: Depends on TRUST token price and network congestion

## Events

### DomainBurned Event

```solidity
event DomainBurned(
    string indexed domain,
    uint256 indexed tokenId,
    address indexed burner
);
```

**Parameters:**
- `domain`: The burned domain name
- `tokenId`: The NFT token ID that was burned
- `burner`: Address of the account that initiated the burn

## Example Scenarios

### Scenario 1: Owner Burns Their Own Expired Domain

1. Alice's domain "alice.trust" expires
2. Alice doesn't renew it
3. Alice clicks "Burn NFT" in manage page
4. Domain is burned and removed
5. Anyone can now register "alice.trust" again

### Scenario 2: Third Party Burns Expired Domain

1. Bob's domain "bob.trust" expires
2. Bob doesn't burn it or renew it
3. Charlie wants to register "bob.trust"
4. Charlie sees domain is expired on blockchain
5. Charlie burns it (or system auto-burns)
6. Charlie immediately registers "bob.trust"

### Scenario 3: Cannot Burn Active Domain

1. Carol's domain "carol.trust" expires in 20 days
2. Dan tries to burn it to free it up
3. Transaction reverts: "Domain not expired"
4. Dan must wait until expiration or Carol can renew

## Technical Details

### Storage Cleanup

```solidity
// Clear all domain data
delete domains[domain];
delete domainToTokenId[domain];
delete tokenIdToDomain[tokenId];

// Remove from owner's list
string[] storage ownerDomainsList = ownerDomains[previousOwner];
for (uint i = 0; i < ownerDomainsList.length; i++) {
    if (keccak256(bytes(ownerDomainsList[i])) == keccak256(bytes(domain))) {
        ownerDomainsList[i] = ownerDomainsList[ownerDomainsList.length - 1];
        ownerDomainsList.pop();
        break;
    }
}

// Burn the NFT
_burn(tokenId);
```

### Frontend Cache Invalidation

After burning, the UI invalidates both query keys:

```typescript
queryClient.invalidateQueries({ queryKey: ["blockchain-domains", walletAddress] });
queryClient.invalidateQueries({ queryKey: ["/api/domains/owner", walletAddress] });
```

This ensures the domain list refreshes immediately after burn.

## API Integration

The burn function is purely on-chain. No backend API call is needed:

1. **Frontend** → Calls `burnExpiredDomain` via web3Service
2. **Smart Contract** → Validates and burns NFT
3. **Blockchain** → Emits `DomainBurned` event
4. **Frontend** → Invalidates cache and updates UI

## Best Practices

### For Domain Owners

1. **Set Reminders**: Get notified before domains expire
2. **Renew Early**: Don't wait until the last minute
3. **Burn Yourself**: If you're done with a domain, burn it yourself
4. **Check Expiry**: Always check expiration dates in manage page

### For Developers

1. **Check Expiry First**: Use `isExpired()` before attempting burn
2. **Handle Errors**: Gracefully handle "Domain not expired" errors
3. **Update UI**: Invalidate both query keys after burn
4. **Show Feedback**: Display clear success/error messages

## Comparison with Renewal

| Action | When Available | Who Can Do It | Outcome |
|--------|---------------|---------------|---------|
| **Renew** | Before expiration | Owner only | Extends expiration, keeps NFT |
| **Burn** | After expiration | Anyone | Removes NFT, frees domain name |

## Resources

- **Contract Function**: `contracts/TNSRegistryERC721.sol` → `burnExpiredDomain()`
- **ABI Definition**: `contracts/TNSRegistryERC721-ABI.json`
- **Web3 Service**: `client/src/lib/web3.ts` → `burnExpiredDomain()`
- **UI Component**: `client/src/components/domain-card.tsx`
- **Security Docs**: `contracts/SECURITY_IMPROVEMENTS.md`
