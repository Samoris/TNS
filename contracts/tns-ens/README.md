# TNS - Trust Name Service

## ENS-Forked Contracts for Intuition Mainnet

This is a **full port of ENS (Ethereum Name Service)** contracts, adapted for the Intuition blockchain with native TRUST token payments.

## Architecture

```
contracts/tns-ens/
├── registry/
│   ├── TNS.sol                    # Interface (ENS.sol equivalent)
│   └── TNSRegistry.sol            # Core registry (ENSRegistry.sol equivalent)
├── ethregistrar/
│   ├── IBaseRegistrar.sol         # Registrar interface
│   ├── BaseRegistrarImplementation.sol  # ERC-721 registrar
│   ├── ITNSRegistrarController.sol      # Controller interface
│   ├── TNSRegistrarController.sol       # Main registration controller
│   ├── IPriceOracle.sol           # Price oracle interface
│   ├── StablePriceOracle.sol      # Tiered pricing
│   └── StringUtils.sol            # String utilities
├── reverseRegistrar/
│   ├── IReverseRegistrar.sol      # Reverse registrar interface
│   ├── ReverseRegistrar.sol       # Reverse resolution
│   └── ReverseClaimer.sol         # Auto-claim reverse for contracts
├── resolvers/
│   ├── Resolver.sol               # Public resolver
│   ├── Multicallable.sol          # Batch calls
│   └── profiles/
│       ├── IAddrResolver.sol      # Address resolution
│       ├── INameResolver.sol      # Name resolution
│       ├── ITextResolver.sol      # Text records
│       └── IContentHashResolver.sol # Content hash
├── wrapper/
│   └── INameWrapper.sol           # NameWrapper interface (optional)
├── root/
│   └── Controllable.sol           # Controller management
├── utils/
│   └── ERC20Recoverable.sol       # Token recovery
└── scripts/
    └── deploy.ts                  # Deployment script
```

## Key Differences from ENS

| ENS | TNS |
|-----|-----|
| .eth TLD | .trust TLD |
| ETH payments | TRUST (native token) payments |
| Ethereum mainnet | Intuition mainnet (Chain ID: 1155) |
| ETH_NODE constant | TRUST_NODE constant |

## Pricing

| Name Length | Price (TRUST/year) |
|-------------|-------------------|
| 1 character | 1000 TRUST |
| 2 characters | 500 TRUST |
| 3 characters | 100 TRUST |
| 4 characters | 70 TRUST |
| 5+ characters | 30 TRUST |

## Deployment

### Prerequisites

1. Install dependencies:
```bash
cd contracts/tns-ens
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your private key
```

### Deploy to Intuition Mainnet

```bash
npm run deploy
```

### Deploy to Local Network

```bash
# Start local node
npx hardhat node

# Deploy
npm run deploy:local
```

## Contract Addresses

After deployment, update these files with the new addresses:
- `client/src/lib/contracts.ts`
- `server/blockchain.ts`

## Registration Flow

1. **Commit**: User submits a commitment hash (prevents front-running)
2. **Wait**: Minimum 60 seconds, maximum 24 hours
3. **Register**: User reveals name and pays in TRUST
4. **NFT**: Domain minted as ERC-721 token

## Grace Period

- 90 days after expiration
- Only the owner can renew during grace period
- After grace period, domain becomes available

## Treasury

All registration and renewal fees are sent to:
`0x629A5386F73283F80847154d16E359192a891f86`

## License

MIT
