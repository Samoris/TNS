# TNS Migration Scripts

This directory contains scripts to help migrate domains from the old TNS contract to the new whitelist-enabled contract.

## Prerequisites

Make sure you have the required dependencies:
```bash
# The ethers package should already be installed in your project
npm install
```

## Migration Process

### Step 1: Export Domain Data

Export all active domains from the old contract:

```bash
node scripts/migrate-domains.js export
```

This will:
- Connect to the old TNS contract
- Fetch all `DomainRegistered` events
- Verify current domain status
- Separate active vs expired domains
- Save data to `migration-data/` directory

**Output files:**
- `migration-data/active-domains.json` - Domains to migrate
- `migration-data/expired-domains.json` - Expired domains (reference only)
- `migration-data/migration-batch.json` - Ready for batch migration

### Step 2: Deploy New Contract

1. Deploy `contracts/TNSRegistryERC721_Whitelist.sol` using Remix
2. Save the new contract address

### Step 3: Execute Migration

#### Option A: Using the Script (Recommended)

Set environment variables:
```bash
export NEW_CONTRACT_ADDRESS="0xYourNewContractAddress"
export PRIVATE_KEY="your_private_key_here"
node scripts/migrate-domains.js migrate
```

Or pass them as arguments:
```bash
node scripts/migrate-domains.js migrate YOUR_PRIVATE_KEY
# (Set NEW_CONTRACT_ADDRESS in the script first)
```

#### Option B: Manual Migration via Remix

1. Open the migration data: `migration-data/migration-batch.json`
2. In Remix, load your deployed contract
3. Call `adminMigrateDomainBatch` with the arrays from the JSON:
   - `domains`: Copy the array
   - `owners`: Copy the array
   - `expirationTimes`: Copy the array
4. Submit transaction

### Step 4: Verify Migration

Verify all domains migrated correctly:

```bash
export NEW_CONTRACT_ADDRESS="0xYourNewContractAddress"
node scripts/migrate-domains.js verify
```

This checks each domain to ensure:
- Domain exists in new contract
- Owner matches expected owner
- Expiration time matches

## Example Workflow

```bash
# 1. Export current domain data
node scripts/migrate-domains.js export

# Output:
# ✅ Found 29 total registration events
# ✓ intuition.trust - Owner: 0xE9bFe128... Expires in 245 days
# ✓ alice.trust - Owner: 0xABC123... Expires in 180 days
# ...
# 💾 Active domains saved to: migration-data/active-domains.json
# 💾 Migration batch data saved to: migration-data/migration-batch.json

# 2. Deploy new contract and get address

# 3. Migrate domains
export NEW_CONTRACT_ADDRESS="0x742d35Cc6C4A8B3e1D36Ac8fB84C45f8E5D6a1E3"
export PRIVATE_KEY="0xYourPrivateKeyHere"
node scripts/migrate-domains.js migrate

# Output:
# 📊 Migration Summary:
#    Domains to migrate: 29
#    Estimated gas: 3,480,000
# 🚀 Executing migration transaction...
# ✅ Migration successful!
#    Domains migrated: 29

# 4. Verify migration
node scripts/migrate-domains.js verify

# Output:
# ✓ intuition.trust - Owner and expiration match
# ✓ alice.trust - Owner and expiration match
# ...
# 📊 Verification Summary:
#    Successful: 29/29
```

## Troubleshooting

### "Migration data not found"
Run the export command first:
```bash
node scripts/migrate-domains.js export
```

### "Wallet is not the contract owner"
Make sure you're using the private key of the address that deployed the new contract.

### "Out of gas" error
The batch migration estimates gas, but you can increase it by editing the script's `gasLimit` parameter.

### Some domains fail verification
Check:
- Domain may have expired between export and migration
- Owner may have changed (check old contract)
- Expiration time format (should be Unix timestamp)

## Security Notes

⚠️ **Never commit your private key to git!**

- Use environment variables
- Or pass as command-line argument
- Delete from command history after use: `history -d $(history 1)`

## Gas Costs

Estimated costs for migrating 29 domains:
- **Batch migration**: ~3.5M gas (~0.035 TRUST @ 10 gwei)
- **Individual migrations**: ~180k gas each (~5.2 TRUST total @ 10 gwei)

**Batch migration is ~150x cheaper!**

## Files Generated

```
migration-data/
├── active-domains.json       # All active domains with full details
├── expired-domains.json      # Expired domains (reference)
└── migration-batch.json      # Formatted for batch migration
```

## Support

See `docs/MIGRATION_GUIDE.md` for detailed migration documentation.
