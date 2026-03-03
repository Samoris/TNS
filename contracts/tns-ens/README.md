# TNS - Trust Name Service

## ENS-Forked Contracts for Intuition Mainnet

TNS is a **full port of ENS (Ethereum Name Service)** contracts, adapted for the Intuition blockchain (Chain ID: 1155) with native TRUST token payments.

---

## Deployed Contracts (V2 — Intuition Mainnet, March 2026)

| Contract | Address | Explorer |
|----------|---------|----------|
| **TNSRegistry** | `0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99` | [View](https://explorer.intuition.systems/address/0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99#code) |
| **BaseRegistrar (ERC-721)** | `0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4` | [View](https://explorer.intuition.systems/address/0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4#code) |
| **TNSRegistrarController** | `0x7C553152e7e4c9d1498D921FB5bd05bDf287f268` | [View](https://explorer.intuition.systems/address/0x7C553152e7e4c9d1498D921FB5bd05bDf287f268#code) |
| **Resolver** | `0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5` | [View](https://explorer.intuition.systems/address/0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5#code) |
| **ReverseRegistrar** | `0x78Cd4f5149060De05a84040283812b0c056972eD` | [View](https://explorer.intuition.systems/address/0x78Cd4f5149060De05a84040283812b0c056972eD#code) |
| **StablePriceOracle** | `0x6F258639D183Fb7955B93d086FA9300eED79383A` | [View](https://explorer.intuition.systems/address/0x6F258639D183Fb7955B93d086FA9300eED79383A#code) |
| **DummyOracle** | `0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb` | [View](https://explorer.intuition.systems/address/0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb#code) |
| **Root** | `0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75` | [View](https://explorer.intuition.systems/address/0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75#code) |
| **PaymentForwarder** | `0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F` | [View](https://explorer.intuition.systems/address/0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F#code) |
| **Treasury** | `0x629A5386F73283F80847154d16E359192a891f86` | [View](https://explorer.intuition.systems/address/0x629A5386F73283F80847154d16E359192a891f86) |

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
        │                       │
        │ ownerOf/tokenURI      │ addr/text/contenthash
        ▼                       ▼
┌───────────────────┐  ┌──────────────────┐
│   Domain Owner    │  │  Domain Records  │
│   (NFT Holder)    │  │  (ETH, IPFS...)  │
└───────────────────┘  └──────────────────┘


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
│   └── TNSRegistry.sol                 # Core registry
├── ethregistrar/
│   ├── IBaseRegistrar.sol              # Registrar interface
│   ├── BaseRegistrarImplementation.sol # ERC-721 domain NFT
│   ├── ITNSRegistrarController.sol     # Controller interface
│   ├── TNSRegistrarController.sol      # Registration with commit-reveal
│   ├── IPriceOracle.sol                # Price oracle interface
│   ├── StablePriceOracle.sol           # Tiered pricing in TRUST
│   └── StringUtils.sol                 # String utilities
├── reverseRegistrar/
│   ├── IReverseRegistrar.sol           # Reverse registrar interface
│   ├── ReverseRegistrar.sol            # Address → name resolution
│   └── ReverseClaimer.sol              # Auto-claim for contracts
├── resolvers/
│   ├── Resolver.sol                    # Public resolver (addr, text, etc.)
│   ├── Multicallable.sol               # Batch operations
│   └── profiles/
│       ├── IAddrResolver.sol           # ETH address resolution
│       ├── INameResolver.sol           # Reverse name lookup
│       ├── ITextResolver.sol           # Text records (email, twitter, etc.)
│       └── IContentHashResolver.sol    # IPFS/content hash
├── utils/
│   ├── PaymentForwarder.sol            # Send TRUST to .trust domains ⚠️ CUSTOM
│   └── ERC20Recoverable.sol            # Token recovery utility
├── wrapper/
│   └── INameWrapper.sol                # NameWrapper interface (optional)
├── root/
│   └── Controllable.sol                # Controller access management
└── scripts/
    ├── deploy.ts                       # Full deployment script
    ├── verify-contracts.ts             # Explorer verification
    └── migrate-with-names.ts           # Domain migration script
```

---

## Key Differences from ENS

| Feature | ENS | TNS |
|---------|-----|-----|
| TLD | `.eth` | `.trust` |
| Payment Token | ETH | TRUST (native) |
| Network | Ethereum (Chain ID: 1) | Intuition (Chain ID: 1155) |
| Base Node | `ETH_NODE` | `TRUST_NODE` |
| Payment Forwarding | Not included | PaymentForwarder contract |

---

## PaymentForwarder Contract

### Why Custom?

ENS does not include a payment forwarding contract. The `PaymentForwarder` is a **custom addition** to TNS that enables users to send TRUST tokens directly to `.trust` domain names without needing to know the recipient's address.

**Use Case**: Send 10 TRUST to `alice.trust` instead of `0x1234...abcd`

### How It Works

```solidity
function sendTo(string calldata name) external payable {
    // 1. Calculate namehash for the domain
    bytes32 node = keccak256(abi.encodePacked(TRUST_NODE, keccak256(bytes(name))));
    
    // 2. Get resolver from registry
    address resolverAddr = tns.resolver(node);
    
    // 3. Get recipient address from resolver
    address payable recipient = IAddrResolver(resolverAddr).addr(node);
    
    // 4. Forward payment
    (bool success, ) = recipient.call{value: msg.value}("");
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

- [x] No storage variables (stateless, uses immutable only)
- [x] No owner/admin functions (permissionless)
- [x] No token handling (native TRUST only)
- [x] No external calls before state changes (CEI pattern N/A)
- [x] Explicit error handling with custom errors
- [x] Events emitted for tracking
- [x] View function for off-chain resolution

### Comparison with Industry Patterns

The PaymentForwarder follows the same pattern used by:
- **ENS Reverse Registrar**: Queries registry then resolver
- **Gnosis Safe**: Forward payments to resolved addresses
- **Tornado Cash**: Minimal stateless forwarder pattern

### Recommendations for Production

1. **Consider adding ReentrancyGuard** (optional, low risk without it)
2. **Add rate limiting** if spam becomes an issue
3. **Monitor events** for unusual activity
4. **Consider upgradeable proxy** for future improvements

---

## Pricing

| Name Length | Price (TRUST/year) |
|-------------|-------------------|
| 3 characters | 100 TRUST |
| 4 characters | 70 TRUST |
| 5+ characters | 30 TRUST |

---

## Registration Flow

1. **Commit** - User submits hash of (name + owner + secret) to prevent front-running
2. **Wait** - Minimum 60 seconds, maximum 24 hours
3. **Register** - User reveals name and pays in TRUST
4. **NFT Minted** - Domain issued as ERC-721 token to owner

---

## Grace Period

- **90 days** after expiration
- Only the original owner can renew during grace period
- After grace period, domain becomes available for anyone to register
- Expired NFTs can be burned by anyone after grace period ends

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
# Intuition Mainnet
npx hardhat run scripts/deploy.ts --network intuition

# Verify contracts
npx hardhat run scripts/verify-contracts.ts --network intuition
```

---

## Contract Verification

All contracts are verified on the Intuition Explorer. Run verification:

```bash
npx hardhat run scripts/verify-contracts.ts --network intuition
```

---

## Security

See [SECURITY.md](./SECURITY.md) for a comprehensive guide on verifying contract security, including:
- Source code verification steps
- ENS codebase comparison
- Custom contract audit checklist
- On-chain verification scripts
- Common vulnerability analysis

---

## License

MIT - Forked from [ENS Contracts](https://github.com/ensdomains/ens-contracts)
