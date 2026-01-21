# TNS ENS-Forked Contracts Deployment Guide

## Prerequisites

1. **Deployer Wallet**: A wallet with sufficient TRUST on Intuition mainnet for gas fees
2. **Hardhat**: Node.js 18+ with Hardhat installed
3. **Private Key**: Your deployer wallet's private key (keep this secure!)

## Network Configuration

Add Intuition mainnet to your Hardhat config (`hardhat.config.ts`):

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    intuition: {
      url: "https://intuition.calderachain.xyz",
      chainId: 1155,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY || ""]
    }
  }
};

export default config;
```

## Environment Setup

Create a `.env` file (DO NOT commit this!):

```bash
DEPLOYER_PRIVATE_KEY=your_private_key_here
TREASURY_ADDRESS=0x629A5386F73283F80847154d16E359192a891f86
BASE_URI=https://tns.intuition.box/api/metadata/
```

## Deployment Steps

### Step 1: Install Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

Verify all 7 contracts compile without errors:
- TNSRegistry
- TNSBaseRegistrar
- TNSPriceOracle
- TNSController
- TNSReverseRegistrar
- TNSResolver
- TNSPaymentForwarder

### Step 3: Deploy to Intuition Mainnet

```bash
npx hardhat run contracts/ens/deploy.ts --network intuition
```

The deployment script will:
1. Deploy all 7 contracts in order
2. Set up the .trust TLD ownership
3. Configure reverse resolution hierarchy
4. Add Controller as authorized controller
5. Set base URI for NFT metadata
6. Configure default resolver

### Step 4: Record Contract Addresses

After deployment, you'll see output like:

```
========== DEPLOYMENT COMPLETE ==========
TNSRegistry: 0x...
TNSBaseRegistrar: 0x...
TNSPriceOracle: 0x...
TNSController: 0x...
TNSReverseRegistrar: 0x...
TNSResolver: 0x...
TNSPaymentForwarder: 0x...
==========================================
```

**Save these addresses!** You'll need to update them in:
- `client/src/lib/contracts.ts` (NEW_CONTRACTS section)
- `server/blockchain.ts` (new contract addresses)

## Post-Deployment Configuration

### Update Frontend Contract Addresses

Edit `client/src/lib/contracts.ts`:

```typescript
export const NEW_CONTRACTS = {
  TNS_REGISTRY_ADDRESS: "0x...", // Replace with deployed address
  TNS_BASE_REGISTRAR_ADDRESS: "0x...",
  TNS_PRICE_ORACLE_ADDRESS: "0x...",
  TNS_CONTROLLER_ADDRESS: "0x...",
  TNS_REVERSE_REGISTRAR_ADDRESS: "0x...",
  TNS_RESOLVER_ADDRESS: "0x...",
  TNS_PAYMENT_FORWARDER_ADDRESS: "0x...",
};
```

### Update Backend Contract Addresses

Edit `server/blockchain.ts`:

```typescript
const NEW_CONTRACTS = {
  REGISTRY: "0x...",
  BASE_REGISTRAR: "0x...",
  CONTROLLER: "0x...",
  RESOLVER: "0x...",
  REVERSE_REGISTRAR: "0x...",
  PRICE_ORACLE: "0x...",
  PAYMENT_FORWARDER: "0x...",
};
```

### Enable New Contracts

Set `USE_NEW_CONTRACTS = true` in both frontend and backend to switch from legacy contracts.

## Domain Migration

After deployment, run the migration script to move existing domains:

```bash
npx hardhat run contracts/ens/migrate.ts --network intuition
```

This will:
1. Query all 132 existing domains from the legacy contract
2. Register them in the new BaseRegistrar with their original owners and expiration dates
3. Preserve all resolver records

## Verification

1. Test domain availability: Check if `available("testdomain")` returns true for unregistered names
2. Test pricing: Verify `rentPrice("test", 31536000)` returns correct values (30 TRUST/year for 5+ chars)
3. Test registration: Complete a full commit-reveal registration cycle

## Contract Addresses Summary

| Contract | Purpose |
|----------|---------|
| TNSRegistry | Core registry mapping names to owners/resolvers |
| TNSBaseRegistrar | ERC-721 registrar owning .trust TLD |
| TNSPriceOracle | Tiered pricing (3 char: 100, 4 char: 70, 5+: 30 TRUST/year) |
| TNSController | Registration with commit-reveal and native TRUST payments |
| TNSReverseRegistrar | Reverse resolution (address → name) |
| TNSResolver | Public resolver for addr/text/contenthash records |
| TNSPaymentForwarder | Send TRUST to .trust domains |

## Pricing Tiers

- 3 characters: 100 TRUST/year
- 4 characters: 70 TRUST/year
- 5+ characters: 30 TRUST/year

## Grace Period

Expired domains have a 90-day grace period where only the original owner can renew.

## Treasury

All registration and renewal fees are sent to:
`0x629A5386F73283F80847154d16E359192a891f86`
