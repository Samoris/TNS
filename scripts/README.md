# TNS Domain Migration Scripts

These scripts help migrate domains from the old TNS contract to the new contract with metadata support.

## Prerequisites

- Node.js and npm installed
- Access to the contract owner's private key
- The new contract must have the migration functions deployed

## Migration Process

### Step 1: Collect Domain Data

Run the data collection script to fetch all domains from the old contract:

```bash
tsx scripts/migrate-domains.ts
```

This will:
- Connect to the old contract at `0xdfe1aB8532925de628C419B65B41f23997c34B4a`
- Fetch all registered domains
- Generate a migration report
- Save data to `migration-data-<timestamp>.json`

### Step 2: Review Migration Data

Open the generated JSON file to review:
- Total domains to migrate
- Owner information
- Expiration dates
- Primary domain settings

### Step 3: Execute Migration

**⚠️ IMPORTANT: This step requires the contract owner's private key!**

Run the migration executor:

```bash
tsx scripts/execute-migration.ts <OWNER_PRIVATE_KEY> migration-data-<timestamp>.json
```

Example:
```bash
tsx scripts/execute-migration.ts 0x1234567890abcdef... migration-data-1234567890.json
```

This will:
- Verify you are the contract owner
- Migrate domains in batches of 10 (to avoid gas limits)
- Mint NFTs to original owners with original expiration dates
- Set primary domains for users who had them configured
- Display progress and transaction hashes

## What Gets Migrated

✅ Domain names
✅ Domain owners
✅ Expiration dates
✅ Token IDs (for reference)
✅ Primary domain settings
✅ NFT ownership

## Contract Functions Used

The new contract includes these admin-only migration functions:

### `batchMigrateDomains()`
Mints domain NFTs in batches without requiring payment:
- `domainNames[]` - Array of domain names (without .trust)
- `owners[]` - Original owner addresses
- `expirationTimes[]` - Unix timestamps for expiration
- `oldTokenIds[]` - Reference to old token IDs

### `batchSetPrimaryDomains()`
Sets primary domains for migrated users:
- `owners[]` - Owner addresses
- `domainNames[]` - Primary domain names

## Gas Estimation

- Each domain migration: ~150,000 gas
- Batch of 10 domains: ~1,500,000 gas
- Setting primary domains: ~50,000 gas per domain

With current gas prices, expect to pay approximately:
- Small migration (10-20 domains): 0.01-0.05 TRUST
- Medium migration (50-100 domains): 0.1-0.3 TRUST
- Large migration (100+ domains): 0.5+ TRUST

## Troubleshooting

### "Not the contract owner" error
Make sure you're using the private key of the address that deployed the new contract.

### Gas limit exceeded
The script uses batches of 10 domains. If this still fails, reduce `BATCH_SIZE` in `execute-migration.ts`.

### Domain already exists
If migration is interrupted and rerun, domains already migrated will be skipped (the contract checks for duplicates).

## Safety Features

✅ Owner-only functions (only contract deployer can migrate)
✅ Reentrancy protection
✅ Array length validation
✅ Domain existence checks
✅ Owner address validation

## After Migration

Once migration is complete:
1. Verify domains on the blockchain explorer
2. Test a few domain lookups
3. Check that NFT metadata displays correctly
4. Notify users that migration is complete
5. Update frontend to use new contract address

## Contract Addresses

- **Old Contract**: `0xdfe1aB8532925de628C419B65B41f23997c34B4a`
- **New Contract**: `0xF5D672880CE1288cB41C8283fe90B68Efc2f6db7`
- **Network**: Intuition Testnet (Chain ID: 13579)
- **Explorer**: https://testnet.explorer.intuition.systems
