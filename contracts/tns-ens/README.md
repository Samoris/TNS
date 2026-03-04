# TNS - Trust Name Service

## ENS-Forked Contracts for Intuition Mainnet

TNS is a **full port of ENS (Ethereum Name Service)** contracts, adapted for the Intuition blockchain (Chain ID: 1155) with native TRUST token payments. All core contracts are exact clones of the audited ENS source with only the minimal changes required for the TNS branding and Intuition network compatibility.

See [CONTRACT_CHANGES.md](./CONTRACT_CHANGES.md) for a detailed diff of every change made to the audited ENS contracts.

---

## Deployed Contracts (V3 — Intuition Mainnet, March 2026)

All 9 contracts are source-code verified on the [Intuition Explorer](https://explorer.intuition.systems).

| Contract | Address | Compiler | Explorer |
|----------|---------|----------|----------|
| **TNSRegistry** | `0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e` | v0.7.6 | [View](https://explorer.intuition.systems/address/0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e#code) |
| **BaseRegistrar (ERC-721)** | `0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629` | v0.5.17 | [View](https://explorer.intuition.systems/address/0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629#code) |
| **ETHRegistrarController** | `0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80` | v0.5.17 | [View](https://explorer.intuition.systems/address/0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80#code) |
| **Resolver** | `0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b` | v0.8.17 | [View](https://explorer.intuition.systems/address/0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b#code) |
| **ReverseRegistrar** | `0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080` | v0.8.17 | [View](https://explorer.intuition.systems/address/0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080#code) |
| **Root** | `0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24` | v0.4.26 | [View](https://explorer.intuition.systems/address/0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24#code) |
| **StablePriceOracle** | `0x77C5F276dd8f7321E42580AC53E73859C080A0f2` | v0.5.17 | [View](https://explorer.intuition.systems/address/0x77C5F276dd8f7321E42580AC53E73859C080A0f2#code) |
| **DummyOracle** | `0x903cc70Cda037249e8D1870Bcd6C528710B73b7E` | v0.8.17 | [View](https://explorer.intuition.systems/address/0x903cc70Cda037249e8D1870Bcd6C528710B73b7E#code) |
| **PaymentForwarder** | `0xF661722f065D8606CC6b5be84296D67D9fe7bD13` | v0.8.17 | [View](https://explorer.intuition.systems/address/0xF661722f065D8606CC6b5be84296D67D9fe7bD13#code) |

---

## Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                              TNS ARCHITECTURE                                |
+-----------------------------------------------------------------------------+

                              +------------------+
                              |   Frontend App   |
                              |   (React/Vite)   |
                              +--------+---------+
                                       |
                    +------------------+------------------+
                    |                  |                  |
                    v                  v                  v
+-----------------------+  +------------------+  +----------------------+
| ETHRegistrarController|  | PaymentForwarder |  |   ReverseRegistrar   |
|  (Registration)       |  | (Send Payments)  |  |  (Primary Domain)    |
+-----------+-----------+  +--------+---------+  +----------+-----------+
            |                       |                       |
            | commit/register       | resolve/sendTo        | setName
            v                       v                       v
+---------------------------------------------------------------------------+
|                              TNSRegistry                                   |
|                   (Core Registry - namehash -> owner/resolver)             |
+---------------------------------+-----------------------------------------+
                                  |
            +---------------------+---------------------+
            |                     |                     |
            v                     v                     v
+-------------------+  +------------------+  +----------------------+
|  BaseRegistrar    |  |     Resolver     |  |  StablePriceOracle   |
|  (ERC-721 NFT)    |  |  (Domain Data)   |  |  (Tiered Pricing)    |
+-------------------+  +------------------+  +----------------------+
        |                       |                     |
        | ownerOf               | addr/text/          | rentPrice
        | nameExpires           | contenthash         | (via DummyOracle)
        v                       v                     v
+-------------------+  +------------------+  +----------------------+
|   Domain Owner    |  |  Domain Records  |  |      Root            |
|   (NFT Holder)    |  |  (address, IPFS, |  |  (TLD Management)    |
|                   |  |   text records)  |  |                      |
+-------------------+  +------------------+  +----------------------+


+-----------------------------------------------------------------------------+
|                           REGISTRATION FLOW                                  |
+-----------------------------------------------------------------------------+

  User                    Controller              BaseRegistrar
   |                          |                        |
   |  1. makeCommitment()     |                        |
   |------------------------->|                        |
   |                          |                        |
   |  2. commit(commitment)   |                        |
   |------------------------->|                        |
   |                          |                        |
   |      Wait 60s-24h        |                        |
   |                          |                        |
   |  3. register(name,...)   |                        |
   |  + TRUST payment --------|                        |
   |------------------------->|                        |
   |                          |  4. register()         |
   |                          |----------------------->|
   |                          |                        |
   |                          |  5. Mint NFT           |
   |                          |<-----------------------|
   |                          |                        |
   |  6. NFT Ownership        |                        |
   |<-------------------------|                        |
   |                          |                        |
   |  Fees stay in controller. Owner can withdraw().   |


+-----------------------------------------------------------------------------+
|                           PAYMENT FORWARDING                                 |
+-----------------------------------------------------------------------------+

  Sender              PaymentForwarder           Registry           Resolver
   |                          |                      |                  |
   |  sendTo("alice") + TRUST |                      |                  |
   |------------------------->|                      |                  |
   |                          |  resolver(node)      |                  |
   |                          |--------------------->|                  |
   |                          |<---------------------|                  |
   |                          |                      |                  |
   |                          |  addr(node)          |                  |
   |                          |--------------------------------------->|
   |                          |<---------------------------------------|
   |                          |                      |                  |
   |                          |  Forward TRUST to recipient             |
   |                          |---------------------------------------------->|
   |                          |                      |                  |    Recipient
   |  Success                 |                      |                  |
   |<-------------------------|                      |                  |
```

---

## Directory Structure

```
contracts/tns-ens/
├── registry/
│   ├── TNS.sol                         # Interface (ENS.sol equivalent)
│   └── TNSRegistry.sol                 # Core registry (namehash -> owner/resolver)
├── ethregistrar/
│   ├── IBaseRegistrar.sol              # Registrar interface
│   └── contracts/
│       ├── BaseRegistrar.sol           # Abstract base registrar
│       ├── BaseRegistrarImplementation.sol  # ERC-721 domain NFT
│       ├── ETHRegistrarController.sol  # Registration controller (commit-reveal)
│       ├── StablePriceOracle.sol       # Tiered pricing (via DSValue oracle)
│       ├── DummyOracle.sol             # Fixed-price oracle (DSValue implementation)
│       ├── SimplePriceOracle.sol       # Alternative price oracle
│       ├── PriceOracle.sol             # Price oracle interface
│       ├── StringUtils.sol             # String length utilities
│       ├── SafeMath.sol                # Math overflow protection
│       └── Migrations.sol              # Truffle migration helper
├── reverseRegistrar/
│   ├── IReverseRegistrar.sol           # Reverse registrar interface
│   ├── ReverseRegistrar.sol            # Address -> name resolution (primary domain)
│   └── ReverseClaimer.sol              # Auto-claim reverse for contracts
├── resolvers/
│   ├── Resolver.sol                    # Public resolver (addr, text, contenthash, name)
│   ├── Multicallable.sol               # Batch operations with delegatecall protection
│   └── profiles/
│       ├── IAddrResolver.sol           # Address resolution interface
│       ├── INameResolver.sol           # Reverse name lookup interface
│       ├── ITextResolver.sol           # Text records interface (email, avatar, etc.)
│       └── IContentHashResolver.sol    # IPFS/content hash interface
├── root/
│   ├── Root.sol                        # Root node owner - manages TLD registration
│   ├── Ownable.sol                     # Legacy ownership pattern (for Root.sol)
│   └── Controllable.sol                # Controller access management
├── utils/
│   ├── PaymentForwarder.sol            # Send TRUST to .trust domains (TNS-specific)
│   └── ERC20Recoverable.sol            # Token recovery utility
├── wrapper/
│   ├── INameWrapper.sol                # NameWrapper interface (not deployed)
│   └── NameWrapper.sol                 # Name wrapping (not deployed)
├── scripts/
│   ├── deploy-all-v3.ts                # V3 deployment script
│   ├── verify-all.ts                   # Verify all 9 contracts on explorer
│   ├── redeploy-controller.ts          # Redeploy controller with fixes
│   ├── migrate-v1-remaining.ts         # V1 domain migration
│   ├── migrate-v2-stragglers.ts        # V2 straggler migration
│   ├── migrate-duplicates.ts           # Duplicate domain migration
│   └── generate-verify-inputs.ts       # Generate Standard JSON Input for verification
├── CONTRACT_CHANGES.md                 # Detailed diff of all ENS -> TNS changes
├── SECURITY.md                         # Security verification guide
└── hardhat.config.ts                   # Hardhat configuration (Intuition network)
```

---

## Key Differences from ENS

| Feature | ENS | TNS |
|---------|-----|-----|
| TLD | `.eth` | `.trust` |
| Payment Token | ETH | TRUST (native token) |
| Network | Ethereum (Chain ID: 1) | Intuition (Chain ID: 1155) |
| Base Node | `ETH_NODE` | `TRUST_NODE` |
| Fee Handling | Fees stay in controller, `withdraw()` to owner | Same as ENS — fees stay in controller, `withdraw()` to owner |
| Payment Forwarding | Not included | PaymentForwarder contract (send TRUST to `.trust` names) |
| Price Oracle | Chainlink `AggregatorInterface` | `DSValue` interface (`DummyOracle` with fixed 1:1 rate) |
| Min Name Length | 3 characters | 3 characters (same as ENS) |
| Resolver | PublicResolver (multi-contract inheritance) | Single Resolver contract with trusted controller/reverse registrar roles |
| DNS Integration | DNSSEC proof-based registration | Not included (`.trust` is not a DNS TLD) |

---

## PaymentForwarder Contract

### Why Custom?

ENS does not include a payment forwarding contract. The `PaymentForwarder` is a **custom addition** to TNS that enables users to send TRUST tokens directly to `.trust` domain names without needing to know the recipient's wallet address.

**Use Case**: Send 10 TRUST to `alice.trust` instead of `0x1234...abcd`

### How It Works

```solidity
function sendTo(string calldata name) external payable {
    // 1. Calculate namehash for the domain
    bytes32 node = keccak256(abi.encodePacked(TRUST_NODE, keccak256(bytes(name))));
    
    // 2. Get resolver from registry
    address resolverAddr = tns.resolver(node);
    require(resolverAddr != address(0), NoResolverSet(name));
    
    // 3. Get recipient address from resolver
    address payable recipient = IAddrResolver(resolverAddr).addr(node);
    require(recipient != address(0), NoAddressSet(name));
    
    // 4. Forward payment
    (bool success, ) = recipient.call{value: msg.value}("");
    require(success, PaymentFailed());
    
    emit PaymentForwarded(name, msg.sender, recipient, msg.value);
}
```

### Security Analysis

| Risk | Mitigation | Severity |
|------|------------|----------|
| **Resolver returns wrong address** | Resolver is set by domain owner only | Low |
| **Reentrancy attack** | Uses `call` with no state changes after | Low |
| **Domain not registered** | Reverts with `NoResolverSet` error | None |
| **Zero address recipient** | Reverts with `NoAddressSet` error | None |
| **Failed payment** | Reverts with `PaymentFailed` error | None |
| **Front-running** | Not applicable (read-only resolution) | None |

### Code Audit Checklist

- [x] No storage variables (stateless, uses `immutable` only)
- [x] No owner/admin functions (fully permissionless)
- [x] No token handling (native TRUST only)
- [x] No external calls before state changes (CEI pattern N/A)
- [x] Explicit error handling with custom errors
- [x] Events emitted for on-chain tracking
- [x] View function (`resolveAddress`) for off-chain resolution
- [x] No upgradeable proxy (immutable deployment)
- [x] No `delegatecall` usage

### Comparison with Industry Patterns

The PaymentForwarder follows the same pattern used by:
- **ENS Reverse Registrar**: Queries registry then resolver
- **Gnosis Safe**: Forward payments to resolved addresses
- **Tornado Cash**: Minimal stateless forwarder pattern

---

## Pricing

| Name Length | Price (TRUST/year) | Tier |
|-------------|-------------------|------|
| 3 characters | 100 TRUST | Premium |
| 4 characters | 70 TRUST | Standard |
| 5+ characters | 30 TRUST | Basic |

Prices are configured in the `StablePriceOracle` contract as per-second rates (e.g., 30 TRUST/year = `950642634420` wei/second). The `DummyOracle` provides a fixed 1:1 USD-to-TRUST exchange rate, so prices are denominated directly in TRUST.

---

## Registration Flow

The registration process uses a **commit-reveal scheme** to prevent front-running:

1. **Make Commitment** (off-chain) — Compute `commitment = keccak256(name, owner, secret)`
2. **Commit** (on-chain) — Submit `commitment` hash to the controller. This reserves the name without revealing it.
3. **Wait** — Minimum 60 seconds, maximum 24 hours. This waiting period ensures the commitment is mined before the reveal.
4. **Register** (on-chain) — Reveal the name, owner, and secret along with TRUST payment. The controller verifies the commitment matches, registers the domain on the BaseRegistrar, and mints an ERC-721 NFT. Fees stay in the controller contract.
5. **Set Records** (optional) — Owner can set resolver records (ETH address, text records, content hash) and configure a primary domain for reverse resolution.

The `registerWithConfig` function additionally sets the resolver and ETH address in the same transaction as registration.

---

## Grace Period

- **90 days** after domain expiration
- Only the original owner can renew during the grace period
- After the grace period, the domain becomes available for anyone to register
- During the grace period, the ERC-721 NFT exists but cannot be transferred
- The `GRACE_PERIOD` constant is set in the `BaseRegistrarImplementation` contract

---

## Deployment

### Prerequisites

```bash
cd contracts/tns-ens
npm install
```

### Configure Environment

```bash
cp .env.example .env
# Add DEPLOYER_PRIVATE_KEY to .env
```

### Deploy

```bash
npx hardhat run scripts/deploy-all-v3.ts --network intuition
```

### Post-Deployment Setup

After deploying all contracts, the following configuration steps are required:

1. **Root** — Transfer root node ownership from deployer to Root contract
2. **Root** — Register `.trust` TLD via `Root.setSubnodeOwner()`
3. **BaseRegistrar** — Add controller via `addController(controllerAddress)`
4. **ReverseRegistrar** — Add controller via `addController(controllerAddress)`
5. **Resolver** — Set trusted controller via `setTrustedController(controllerAddress)`
6. **Resolver** — Set trusted reverse registrar via `setTrustedReverseRegistrar(reverseRegistrarAddress)`

---

## Contract Verification

All 9 contracts are source-code verified on the Intuition Explorer (Blockscout).

### Verify All Contracts

```bash
npx hardhat run scripts/verify-all.ts --network intuition
```

### Verify Individual Contract

```bash
npx hardhat verify --network intuition <CONTRACT_ADDRESS> [constructor args...]
```

### Standard JSON Input Files

Pre-generated Standard JSON Input files for manual verification are available in `scripts/verification/`. Each file contains the full source code, compiler settings, and constructor arguments needed for independent verification.

---

## Security

See [SECURITY.md](./SECURITY.md) for a comprehensive security verification guide, including:

- Source code verification steps
- ENS codebase comparison methodology
- Custom contract audit checklist (PaymentForwarder)
- On-chain verification scripts
- Common vulnerability analysis for each contract

### Quick Security Summary

| Component | Origin | Security Level | Notes |
|-----------|--------|----------------|-------|
| TNSRegistry | ENS Fork | High | Battle-tested, minimal changes |
| BaseRegistrar | ENS Fork | High | Standard ERC-721, minimal changes |
| ETHRegistrarController | ENS Fork | High | Commit-reveal, ENS-matching fee handling |
| StablePriceOracle | ENS Fork | High | DSValue oracle instead of Chainlink |
| ReverseRegistrar | ENS Fork | High | Controllable inheritance added |
| Root | ENS Fork | High | TLD management, minimal changes |
| Resolver | ENS-based | High | Simplified single-contract design |
| DummyOracle | ENS Fork | High | Fixed-price oracle |
| PaymentForwarder | Custom | Medium | Stateless, permissionless, needs independent review |

---

## Migration History

### V1 -> V2 -> V3

All domains have been migrated through three contract versions with preserved ownership and expiry dates:

- **V1** (initial deployment): First set of contracts, deprecated
- **V2** (deprecated): Used `TNSRegistrarController` with treasury forwarding, deprecated
- **V3** (current): Uses `ETHRegistrarController` matching ENS naming, fees stay in controller

**Final V3 state:**
- 143 active on-chain domains
- 111 unique holders
- All V1 and V2 controllers permanently disabled
- Migration performed via event-based batch scripts

---

## License

MIT — Forked from [ENS Contracts](https://github.com/ensdomains/ens-contracts)
