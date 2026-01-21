# TNS ENS Fork Contracts

This directory contains the TNS (Trust Name Service) contracts, forked and adapted from ENS (Ethereum Name Service) for the Intuition blockchain.

## Contract Overview

### Core Contracts

1. **ITNS.sol** - Interface for the TNS Registry (equivalent to ENS interface)
2. **TNSRegistry.sol** - Main registry mapping domain names to owners and resolvers
3. **TNSBaseRegistrar.sol** - ERC-721 registrar that owns the .trust TLD
4. **TNSController.sol** - Registration controller with commit-reveal and TRUST token payments
5. **TNSResolver.sol** - Public resolver for address, text, and contenthash records
6. **TNSReverseRegistrar.sol** - Handles reverse resolution (address → name)
7. **TNSPaymentForwarder.sol** - Enables payments to .trust domains

### Supporting Contracts

- **TNSPriceOracle.sol** - Tiered pricing (3 char: 100 TRUST, 4 char: 70 TRUST, 5+: 30 TRUST)
- **StringUtils.sol** - UTF-8 string length calculation
- **IERC20.sol** - ERC-20 token interface for TRUST token

## Deployment Order

Contracts must be deployed in this specific order:

```
1. TNSRegistry
2. TNSBaseRegistrar (requires TNSRegistry, baseNode)
3. TNSPriceOracle
4. TNSController (requires BaseRegistrar, PriceOracle, TRUST token, treasury)
5. TNSResolver (requires TNSRegistry, BaseRegistrar, Controller, ReverseRegistrar)
6. TNSReverseRegistrar (requires TNSRegistry)
7. TNSPaymentForwarder (requires TNSRegistry, Resolver, TRUST token, baseNode)
```

## Post-Deployment Setup

1. Transfer .trust TLD ownership to BaseRegistrar:
   ```solidity
   registry.setSubnodeOwner(0x0, trustLabelHash, baseRegistrar.address)
   ```

2. Add Controller as authorized controller on BaseRegistrar:
   ```solidity
   baseRegistrar.addController(controller.address)
   ```

3. Set default resolver on ReverseRegistrar:
   ```solidity
   reverseRegistrar.setDefaultResolver(resolver.address)
   ```

4. Set BaseRegistrar's base URI for NFT metadata:
   ```solidity
   baseRegistrar.setBaseURI("https://tns.intuition.box/api/metadata/")
   ```

## Key Differences from ENS

1. **Native TRUST Payments** - Uses native TRUST token (like ETH on Ethereum) - payable functions
2. **Simplified Resolver** - Single resolver contract instead of profile-based inheritance
3. **Tiered Pricing** - Built-in character-length based pricing
4. **90-Day Grace Period** - Matches ENS standard for expired domain renewal
5. **60s/24h Commit Window** - Customized for Intuition block times

## Namehash Calculation

The `.trust` TLD namehash:
```javascript
const trustNode = ethers.utils.namehash('trust');
// Or manually: keccak256(keccak256(0x0, keccak256('trust')))
```

## Testing

Ensure all contracts compile:
```bash
npx hardhat compile
```

Run tests:
```bash
npx hardhat test
```
