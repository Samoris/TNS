# TNS - Trust Name Service

## ENS-Forked Contracts for Intuition Mainnet

TNS is a **full port of ENS (Ethereum Name Service)** contracts, adapted for the Intuition blockchain (Chain ID: 1155) with native TRUST token payments. All core contracts are exact clones of the audited ENS source with only the minimal changes required for the TNS branding and Intuition network compatibility.

See [CONTRACT_CHANGES.md](./CONTRACT_CHANGES.md) for a detailed diff of every change made to the audited ENS contracts.

---

## Deployed Contracts (V2 — Intuition Mainnet, March 2026)

All contracts are verified on the [Intuition Explorer](https://explorer.intuition.systems).

| Contract | Address | Compiler | Explorer |
|----------|---------|----------|----------|
| **TNSRegistry** | `0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99` | v0.8.17 | [View](https://explorer.intuition.systems/address/0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99#code) |
| **BaseRegistrar (ERC-721)** | `0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4` | v0.5.17 | [View](https://explorer.intuition.systems/address/0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4#code) |
| **TNSRegistrarController** | `0x7C553152e7e4c9d1498D921FB5bd05bDf287f268` | v0.5.17 | [View](https://explorer.intuition.systems/address/0x7C553152e7e4c9d1498D921FB5bd05bDf287f268#code) |
| **Resolver** | `0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5` | v0.8.17 | [View](https://explorer.intuition.systems/address/0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5#code) |
| **ReverseRegistrar** | `0x78Cd4f5149060De05a84040283812b0c056972eD` | v0.8.17 | [View](https://explorer.intuition.systems/address/0x78Cd4f5149060De05a84040283812b0c056972eD#code) |
| **Root** | `0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75` | v0.4.26 | [View](https://explorer.intuition.systems/address/0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75#code) |
| **StablePriceOracle** | `0x6F258639D183Fb7955B93d086FA9300eED79383A` | v0.5.17 | [View](https://explorer.intuition.systems/address/0x6F258639D183Fb7955B93d086FA9300eED79383A#code) |
| **DummyOracle** | `0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb` | v0.8.17 | [View](https://explorer.intuition.systems/address/0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb#code) |
| **PaymentForwarder** | `0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F` | v0.8.17 | [View](https://explorer.intuition.systems/address/0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F#code) |
| **Treasury** | `0x629A5386F73283F80847154d16E359192a891f86` | N/A | [View](https://explorer.intuition.systems/address/0x629A5386F73283F80847154d16E359192a891f86) |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TNS ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   Frontend App   │
                              │   (React/Vite)   │
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
┌───────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  TNSRegistrarController│  │ PaymentForwarder │  │   ReverseRegistrar   │
│  (Registration)        │  │ (Send Payments)  │  │  (Primary Domain)    │
└───────────┬───────────┘  └────────┬─────────┘  └──────────┬───────────┘
            │                       │                       │
            │ commit/register       │ resolve/sendTo        │ setName
            ▼                       ▼                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              TNSRegistry                                   │
│                   (Core Registry - namehash → owner/resolver)              │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  BaseRegistrar    │  │     Resolver     │  │  StablePriceOracle   │
│  (ERC-721 NFT)    │  │  (Domain Data)   │  │  (Tiered Pricing)    │
└───────────────────┘  └──────────────────┘  └──────────────────────┘
        │                       │                     │
        │ ownerOf               │ addr/text/          │ rentPrice
        │ nameExpires           │ contenthash         │ (via DummyOracle)
        ▼                       ▼                     ▼
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   Domain Owner    │  │  Domain Records  │  │      Root            │
│   (NFT Holder)    │  │  (address, IPFS, │  │  (TLD Management)    │
│                   │  │   text records)  │  │                      │
└───────────────────┘  └──────────────────┘  └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                           REGISTRATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  User                    Controller              BaseRegistrar        Treasury
   │                          │                        │                   │
   │  1. makeCommitment()     │                        │                   │
   │─────────────────────────>│                        │                   │
   │                          │                        │                   │
   │  2. commit(commitment)   │                        │                   │
   │─────────────────────────>│                        │                   │
   │                          │                        │                   │
   │      ⏳ Wait 60s-24h     │                        │                   │
   │                          │                        │                   │
   │  3. register(name,...)   │                        │                   │
   │  + TRUST payment ────────│                        │                   │
   │─────────────────────────>│                        │                   │
   │                          │  4. register()         │                   │
   │                          │───────────────────────>│                   │
   │                          │                        │                   │
   │                          │  5. Forward TRUST ─────│───────────────────>│
   │                          │                        │                   │
   │                          │  6. Mint NFT           │                   │
   │                          │<───────────────────────│                   │
   │                          │                        │                   │
   │  7. NFT Ownership        │                        │                   │
   │<─────────────────────────│                        │                   │


┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT FORWARDING                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  Sender              PaymentForwarder           Registry           Resolver
   │                          │                      │                  │
   │  sendTo("alice") + TRUST │                      │                  │
   │─────────────────────────>│                      │                  │
   │                          │  resolver(node)      │                  │
   │                          │─────────────────────>│                  │
   │                          │<─────────────────────│                  │
   │                          │                      │                  │
   │                          │  addr(node)          │                  │
   │                          │─────────────────────────────────────────>│
   │                          │<─────────────────────────────────────────│
   │                          │                      │                  │
   │                          │  Forward TRUST to recipient             │
   │                          │──────────────────────────────────────────────>│
   │                          │                      │                  │    Recipient
   │  Success                 │                      │                  │
   │<─────────────────────────│                      │                  │
```

---

## Directory Structure

```
contracts/tns-ens/
├── registry/
│   ├── TNS.sol                         # Interface (ENS.sol equivalent)
│   └── TNSRegistry.sol                 # Core registry (namehash → owner/resolver)
├── ethregistrar/
│   ├── IBaseRegistrar.sol              # Registrar interface
│   └── contracts/
│       ├── BaseRegistrar.sol           # Abstract base registrar
│       ├── BaseRegistrarImplementation.sol  # ERC-721 domain NFT
│       ├── ETHRegistrarController.sol  # TNSRegistrarController (commit-reveal registration)
│       ├── StablePriceOracle.sol       # Tiered pricing (via DSValue oracle)
│       ├── DummyOracle.sol             # Fixed-price oracle (DSValue implementation)
│       ├── SimplePriceOracle.sol       # Alternative price oracle
│       ├── PriceOracle.sol             # Price oracle interface
│       ├── StringUtils.sol             # String length utilities
│       ├── SafeMath.sol                # Math overflow protection
│       └── Migrations.sol              # Truffle migration helper
├── reverseRegistrar/
│   ├── IReverseRegistrar.sol           # Reverse registrar interface
│   ├── ReverseRegistrar.sol            # Address → name resolution (primary domain)
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
│   ├── Root.sol                        # Root node owner — manages TLD registration
│   ├── Ownable.sol                     # Legacy ownership pattern (for Root.sol)
│   └── Controllable.sol                # Controller access management
├── utils/
│   ├── PaymentForwarder.sol            # Send TRUST to .trust domains (TNS-specific)
│   └── ERC20Recoverable.sol            # Token recovery utility
├── wrapper/
│   ├── INameWrapper.sol                # NameWrapper interface (not deployed)
│   └── NameWrapper.sol                 # Name wrapping (not deployed)
├── scripts/
│   ├── deploy.ts                       # Full deployment script
│   ├── verify-all.ts                   # Verify all 9 contracts on explorer
│   ├── redeploy-controller.ts          # Redeploy controller with fixes
│   ├── migrate-events.ts              # Event-based domain migration (V1 → V2)
│   └── generate-verify-inputs.ts       # Generate Standard JSON Input for verification
├── CONTRACT_CHANGES.md                 # Detailed diff of all ENS → TNS changes
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
| Fee Handling | Fees stay in controller, `withdraw()` to owner | Fees forwarded directly to treasury on `register()` / `renew()` |
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
4. **Register** (on-chain) — Reveal the name, owner, and secret along with TRUST payment. The controller verifies the commitment matches, registers the domain on the BaseRegistrar, mints an ERC-721 NFT, and forwards the fee to the treasury.
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
npx hardhat run scripts/deploy.ts --network intuition
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

All 9 contracts are verified on the Intuition Explorer (Blockscout).

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
| TNSRegistrarController | ENS Fork | High | Commit-reveal, treasury addition |
| StablePriceOracle | ENS Fork | High | DSValue oracle instead of Chainlink |
| ReverseRegistrar | ENS Fork | High | Controllable inheritance added |
| Root | ENS Fork | High | TLD management, minimal changes |
| Resolver | ENS-based | High | Simplified single-contract design |
| DummyOracle | ENS Fork | High | Fixed-price oracle |
| PaymentForwarder | Custom | Medium | Stateless, permissionless, needs independent review |

---

## Migration (V1 → V2)

All 258 domains from V1 contracts were successfully migrated to V2 in March 2026:

- Domain ownership preserved (same NFT token IDs)
- Expiry dates preserved exactly
- Migration performed via `migrate-events.ts` script (event-based batch migration)
- V1 contracts are deprecated and no longer in use

---

## License

MIT — Forked from [ENS Contracts](https://github.com/ensdomains/ens-contracts)
