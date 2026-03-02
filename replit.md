# Trust Name Service (TNS)

## Overview
The Trust Name Service (TNS) is a decentralized naming service for the Intuition mainnet, similar to ENS. It allows users to register human-readable `.trust` domain names that link to blockchain addresses and other resources. Key features include domain registration, address resolution, payment forwarding, reverse resolution, domain renewal, and NFT ownership of domains. The project aims to provide a robust and user-friendly naming solution for the Intuition ecosystem, integrating with Intuition's decentralized Knowledge Graph to enable AI agent identity infrastructure.

## User Preferences
- Focus on clean, intuitive UI similar to ENS
- Emphasize the `.trust` branding
- Include clear pricing display
- Implement domain search functionality

## System Architecture
TNS is built with smart contracts, a modern frontend, and a supporting backend API.

### UI/UX Decisions
The frontend prioritizes a clean, intuitive user experience, emphasizing `.trust` branding. Key UI elements include a domain search and registration interface with a 2-step commit-reveal process, a domain management dashboard for owners, a "Send Payment" page for token transfers, reverse resolution display, and consistent pricing.

### Technical Implementations
Core features include domain registration with a 2-step commit-reveal process, address resolution, payment forwarding, reverse resolution, domain extension/renewal, and ERC-721 NFT ownership. Security features include front-running protection, reentrancy protection, a 90-day grace period for expired domains, and on-chain primary domain storage. Pricing is tiered based on domain character length (3 chars: 100 TRUST/year, 4 chars: 70 TRUST/year, 5+ chars: 30 TRUST/year). A backend-driven metadata system ensures accurate and persistent NFT metadata via dynamic SVG image generation and a comprehensive metadata API.

### Feature Specifications
- **Domain Registration**: Uses a commit-reveal scheme.
- **Payment Forwarding**: Allows direct TRUST token transfers to `.trust` domains.
- **Reverse Resolution**: Users can set a primary domain to be displayed instead of their wallet address.
- **Domain Management**: Owners can set resolver records (ETH address, IPFS hash, text records), upload domain images, and manage primary domain status.
- **Domain Image Upload**: Images are uploaded to Replit Object Storage, pinned to IPFS via Pinata, and the IPFS gateway URL is stored in the resolver's avatar text record. Falls back to direct object storage URLs if IPFS pinning fails.
- **Domain Renewal**: Flexible duration options with real-time cost calculation.
- **NFT Metadata**: ERC-721 compliant metadata with dynamic SVG images and attributes like domain length, pricing tier, and dates.

### System Design Choices
The smart contracts are exact clones of the audited ENS contracts (from `intuition-box/ens_ethregistrar-tns-diff` and `intuition-box/ens_root-tns-diff`), with only `ENS` → `TNS`, `.eth` → `.trust`, and TNS-specific pricing as changes. The contract set includes: `TNSRegistry`, `BaseRegistrarImplementation` (ERC-721), `TNSRegistrarController` (commit-reveal with `registerWithConfig`), `StablePriceOracle` (USD-based via Chainlink `AggregatorInterface`), `Root` (root node ownership with TLD locking), `ReverseRegistrar`, `Resolver`, and `PaymentForwarder`. Supporting contracts include `DummyOracle`, `SimplePriceOracle`, `SafeMath`, `StringUtils`, `Ownable`, and `Controllable`. Migrated domains are handled gracefully, ensuring address resolution and payment forwarding work even without resolver records.
The frontend is built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, and Wouter. The backend uses Express.js and TypeScript, providing APIs for domain availability, registration, and user account management.

### Data Persistence
TNS uses a **PostgreSQL database** for permanent storage of:
- **Agent registrations** - All registered AI agents with their metadata, capabilities, endpoints
- **Domain records** - Domain ownership, resolver records, commit-reveal data
- **Sync status** - Knowledge Graph synchronization state

The database is managed via Drizzle ORM with schema defined in `shared/schema.ts`. Key tables:
- `agents` - Stores agent domain, address, type, capabilities, endpoints, reputation
- `domains` - Domain ownership and registration data
- `domainRecords` - Resolver records (addresses, text records, avatar)
- `domainCommits` - Commit-reveal registration data
- `domainSyncStatus` - Knowledge Graph sync tracking
Agent registrations persist permanently across server restarts.

### Automatic Blockchain Sync
When agents register, the system automatically:
1. Saves agent metadata to the PostgreSQL database (permanent storage)
2. Checks if an on-chain "atom" already exists for the agent
3. If not, prepares a blockchain transaction for the user to sign
4. The transaction creates a permanent atom on Intuition's Knowledge Graph
5. Costs ~0.1 TRUST to create an atom on-chain

This dual storage approach ensures:
- **Immediate availability**: Agent is discoverable instantly via database
- **Permanent identity**: On-chain atom provides immutable blockchain proof
- **Graceful degradation**: If user declines signing, agent still works off-chain

### Intuition Knowledge Graph Integration
TNS integrates with Intuition's Knowledge Graph for AI agent identity infrastructure using the `@0xintuition/graphql` SDK.
- **API Endpoints**: Provide access to domain atom metadata, knowledge graph relationships, domain reputation, and agent registry functionalities like registration, discovery, and record updates.
- **MCP Server Tools**: The MCP server exposes tools for AI assistants, including `resolve_domain`, `check_availability`, `get_domain_reputation`, `get_domain_graph`, `discover_agents`, `get_agent_info`, `get_pricing`, and `search_atoms`.
- **Agent Identity Schema**: Agents registered with .trust domains store metadata like `agentType`, `capabilities`, `endpoint`, `mcpEndpoint`, `publicKey`, and `version`.
- **Agent-to-Agent Messaging and Authentication**: Facilitates secure communication and authentication between agents.
- **Agent Reputation & Staking**: Provides endpoints for managing agent reputation and staking.
- **Knowledge Graph Sync Endpoints**: Manage syncing of domain information (atoms and triples) to the Knowledge Graph, including user domains, scanning for new domains, checking sync status, and preparing/confirming batch transactions.
- **Domain Record Sync**: Updates to domain records are synced to the Knowledge Graph as atoms and triples, following a two-step process to create atoms and then triples.
- **Atom URI Format**: Domain atoms use the format `{domainName}.trust` in the Knowledge Graph for stable identity.
- **Sync Workflow**: Involves user wallet connection, fetching domain sync status, creating atom transactions, and confirming synchronization.

## External Dependencies
- **Blockchain Network**: Intuition mainnet (Chain ID: 1155, RPC URL: `https://intuition.calderachain.xyz`, Explorer URL: `https://explorer.intuition.systems`)
- **Smart Contract Addresses (V2 — deployed March 2026)**:
  - TNS Registry: `0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99`
  - Base Registrar (ERC-721): `0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4`
  - Controller: `0x7C553152e7e4c9d1498D921FB5bd05bDf287f268`
  - Resolver: `0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5`
  - Reverse Registrar: `0x78Cd4f5149060De05a84040283812b0c056972eD`
  - Price Oracle (Stable): `0x6F258639D183Fb7955B93d086FA9300eED79383A`
  - Dummy Oracle: `0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb`
  - Payment Forwarder: `0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F`
  - Root: `0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75`
  - Treasury: `0x629A5386F73283F80847154d16E359192a891f86`
  - Intuition EthMultiVault (Proxy): `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e`
- **V1 (deprecated) Contract Addresses**: Registry `0x34D7648...`, BaseRegistrar `0xc08c5b...`, Controller `0x57C93D...`, Resolver `0x17Adb5...`
- **Migration**: All 258 domains from V1 contracts successfully migrated to V2 contracts with preserved ownership and expiry dates. Treasury now receives fees directly on register/renew.
- **Wallet Integration**: MetaMask
- **Smart Contract Libraries**: OpenZeppelin
- **Styling Framework**: Tailwind CSS
- **UI Component Library**: shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter