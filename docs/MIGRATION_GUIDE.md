# TNS Domain Migration Guide

## Overview
This guide explains how to migrate existing domains from the old TNS contract to the new whitelist-enabled contract while preserving all ownership and expiration data.

## Migration Functions

### Single Domain Migration
```solidity
adminMigrateDomain(
    string calldata domain,      // e.g., "intuition"
    address owner,                // e.g., "0xE9bF..."
    uint256 expirationTime        // e.g., 1750000000 (Unix timestamp)
)
```

### Batch Migration (Recommended)
```solidity
adminMigrateDomainBatch(
    string[] calldata domains,          // ["domain1", "domain2", ...]
    address[] calldata owners,          // ["0xABC...", "0xDEF...", ...]
    uint256[] calldata expirationTimes  // [1750000000, 1760000000, ...]
)
```

## Step-by-Step Migration Process

### Phase 1: Export Existing Domain Data

#### Option A: From Block Explorer
1. Go to https://testnet.explorer.intuition.systems/address/0xdfe1aB8532925de628C419B65B41f23997c34B4a
2. Click on "Events" tab
3. Filter for `DomainRegistered` events
4. Export all events to CSV/JSON
5. Extract: domain name, owner address, expiration timestamp

#### Option B: Using Web3 Script
```javascript
// Script to export domain data from old contract
const { ethers } = require('ethers');

const OLD_CONTRACT_ADDRESS = "0xdfe1aB8532925de628C419B65B41f23997c34B4a";
const RPC_URL = "https://testnet.rpc.intuition.systems";

const OLD_CONTRACT_ABI = [
  "event DomainRegistered(string indexed domain, address indexed owner, uint256 indexed tokenId, uint256 expirationTime)",
  "function getDomainInfo(string) view returns (address, uint256, uint256, bool)"
];

async function exportDomains() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(OLD_CONTRACT_ADDRESS, OLD_CONTRACT_ABI, provider);
  
  // Get all DomainRegistered events
  const filter = contract.filters.DomainRegistered();
  const events = await contract.queryFilter(filter);
  
  const domains = [];
  
  for (const event of events) {
    const domainName = event.args.domain;
    const owner = event.args.owner;
    const expirationTime = event.args.expirationTime;
    
    // Verify domain is still valid (not expired/transferred)
    const [currentOwner, , expiration, exists] = await contract.getDomainInfo(domainName);
    
    if (exists && expiration > Date.now() / 1000) {
      domains.push({
        domain: domainName,
        owner: currentOwner, // Use current owner in case of transfers
        expirationTime: expiration.toString()
      });
    }
  }
  
  console.log(JSON.stringify(domains, null, 2));
  console.log(`\nTotal active domains: ${domains.length}`);
  
  return domains;
}

exportDomains();
```

### Phase 2: Deploy New Whitelist Contract

1. **Compile Contract**
   - Open Remix: https://remix.ethereum.org
   - Create file: `TNSRegistryERC721_Whitelist.sol`
   - Copy contract code from `contracts/TNSRegistryERC721_Whitelist.sol`
   - Compile with Solidity 0.8.30+

2. **Deploy to Intuition Testnet**
   - Select "Injected Provider - MetaMask"
   - Make sure you're on Intuition testnet
   - Deploy contract
   - **Save the new contract address!**

### Phase 3: Migrate Domains

#### Option A: Batch Migration (Recommended for all 29 domains)

1. **Prepare Migration Data**
   - Create arrays from exported data:
   ```javascript
   const domains = ["intuition", "alice", "bob", ...];
   const owners = ["0xE9bF...", "0xABC...", "0xDEF...", ...];
   const expirationTimes = [1750000000, 1760000000, 1770000000, ...];
   ```

2. **Execute Migration**
   - In Remix, under "Deployed Contracts"
   - Find `adminMigrateDomainBatch` function
   - Paste arrays into respective fields
   - Click "transact"
   - Confirm in MetaMask
   - Wait for confirmation (~30-60 seconds for 29 domains)

3. **Verify Migration**
   ```javascript
   // Check each domain was migrated correctly
   for (const domain of domains) {
     const info = await newContract.getDomainInfo(domain);
     console.log(`${domain}: owner=${info.domainOwner}, expiration=${info.expirationTime}`);
   }
   ```

#### Option B: Individual Migration (For testing or specific domains)

1. **Test with One Domain First**
   - Call `adminMigrateDomain("intuition", "0xE9bF...", 1750000000)`
   - Verify it worked: `getDomainInfo("intuition")`

2. **Migrate Remaining Domains**
   - Repeat for each domain
   - More gas-intensive (29 separate transactions)

### Phase 4: Update Frontend

1. **Update Contract Address**
   ```typescript
   // In client/src/lib/contracts.ts
   export const TNS_REGISTRY_ADDRESS = "YOUR_NEW_CONTRACT_ADDRESS";
   ```

2. **Add Migration Functions to ABI**
   Add to `TNS_REGISTRY_ABI` array:
   ```typescript
   {
     "inputs": [
       { "internalType": "string", "name": "domain", "type": "string" },
       { "internalType": "address", "name": "owner", "type": "address" },
       { "internalType": "uint256", "name": "expirationTime", "type": "uint256" }
     ],
     "name": "adminMigrateDomain",
     "outputs": [],
     "stateMutability": "nonpayable",
     "type": "function"
   },
   {
     "inputs": [
       { "internalType": "string[]", "name": "domains", "type": "string[]" },
       { "internalType": "address[]", "name": "owners", "type": "address[]" },
       { "internalType": "uint256[]", "name": "expirationTimes", "type": "uint256[]" }
     ],
     "name": "adminMigrateDomainBatch",
     "outputs": [],
     "stateMutability": "nonpayable",
     "type": "function"
   }
   ```

3. **Restart Application**
   - The app will now use the new contract
   - All migrated domains will appear correctly

### Phase 5: Verification Checklist

- [ ] All 29 domains migrated successfully
- [ ] Each domain has correct owner
- [ ] Expiration times preserved
- [ ] NFTs minted to correct addresses
- [ ] Users can see their domains in "My Domains"
- [ ] Primary domains still work
- [ ] Domain renewals work
- [ ] New registrations work with whitelist

## Migration Data Template

### CSV Format
```csv
domain,owner,expirationTime
intuition,0xE9bFe128b7F0F7486c206Aa87a2C2E796fc77BcD,1750000000
alice,0xABC123...,1760000000
bob,0xDEF456...,1770000000
```

### JSON Format
```json
[
  {
    "domain": "intuition",
    "owner": "0xE9bFe128b7F0F7486c206Aa87a2C2E796fc77BcD",
    "expirationTime": "1750000000"
  },
  {
    "domain": "alice",
    "owner": "0xABC123...",
    "expirationTime": "1760000000"
  }
]
```

## Gas Costs & Timing

### Estimated Gas Costs
- **Single Migration**: ~180,000 gas (~0.0018 TRUST @ 10 gwei)
- **Batch Migration (29 domains)**: ~3,500,000 gas (~0.035 TRUST @ 10 gwei)

### Time Estimates
- **Export domain data**: 5-10 minutes
- **Deploy new contract**: 2-3 minutes
- **Batch migrate 29 domains**: 1-2 minutes
- **Update frontend**: 2-3 minutes
- **Total**: ~15-20 minutes

## Rollback Plan

If migration fails or issues arise:

1. **Keep old contract active** - Users can still access their domains
2. **Fix issues in new contract** - Redeploy if necessary
3. **Re-run migration** - Start fresh with corrected data
4. **Old domains remain valid** - No data loss

## Security Considerations

1. **Only Contract Owner** can migrate domains
2. **Verify owner address** before calling migration
3. **Backup domain data** before migration
4. **Test with 1-2 domains** before batch migration
5. **Monitor gas prices** - Migrate during low network activity

## Post-Migration Tasks

1. **Announce migration** to users
2. **Update documentation** with new contract address
3. **Verify on block explorer** - Check contract on Intuition explorer
4. **Test all features**:
   - Domain registration
   - Domain renewal
   - Whitelist functionality
   - Primary domain setting
   - Domain transfers
5. **Monitor for issues** in first 24-48 hours

## Support & Troubleshooting

### Common Issues

**Issue**: "Domain already registered"
- **Solution**: Check if domain was already migrated or exists in new contract

**Issue**: "Expiration time must be in future"
- **Solution**: Domain may have expired - renew it manually or skip migration

**Issue**: "Array lengths must match"
- **Solution**: Ensure domains[], owners[], and expirationTimes[] have same length

**Issue**: Transaction fails with "Out of gas"
- **Solution**: Reduce batch size or increase gas limit

### Getting Help

- Check contract events on block explorer
- Review transaction logs for error messages
- Test migration with single domain first
- Verify all addresses and timestamps are valid

## Conclusion

Migration preserves all existing domain data while adding powerful whitelist functionality. The process is straightforward and can be completed in under 20 minutes with proper preparation.
