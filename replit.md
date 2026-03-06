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
Core features include domain registration with a 2-step commit-reveal process, address resolution, payment forwarding, reverse resolution, domain extension/renewal, and ERC-721 NFT ownership. Security features include front-running protection, reentrancy protection, a 90-day grace period for expired domains (set in BaseRegistrar), and on-chain primary domain storage. Pricing is tiered based on domain character length (3 chars: 100 TRUST/year, 4 chars: 70 TRUST/year, 5+ chars: 30 TRUST/year). A backend-driven metadata system ensures accurate and persistent NFT metadata via dynamic SVG image generation and a comprehensive metadata API.

### Feature Specifications
- **Domain Registration**: Uses a commit-reveal scheme.
- **Payment Forwarding**: Allows direct TRUST token transfers to `.trust` domains.
- **Reverse Resolution**: Users can set a primary domain to be displayed instead of their wallet address.
- **Domain Management**: Owners can set resolver records (ETH address, IPFS hash, text records), upload domain images, and manage primary domain status.
- **Domain Image Upload**: Images are uploaded to Replit Object Storage, pinned to IPFS via Pinata, and the IPFS gateway URL is stored in the resolver's avatar text record. Falls back to direct object storage URLs if IPFS pinning fails.
- **Domain Renewal**: Flexible duration options with real-time cost calculation.
- **NFT Metadata**: ERC-721 compliant metadata with dynamic SVG images and attributes like domain length, pricing tier, and dates.

### System Design Choices
The smart contracts are exact clones of the audited ENS contracts (from [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) and [`intuition-box/diff_root-contracts_ENS-TNS`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)), with minimal changes: `.eth` → `.trust` TLD restriction in Root, `DSValue` oracle instead of Chainlink in StablePriceOracle, simplified `register(name, owner, duration, secret)` instead of `registerWithConfig`, and TNS-specific comments. The ethregistrar contracts (BaseRegistrar, BaseRegistrarImplementation, ETHRegistrarController, StablePriceOracle) keep the original `ENS` type and `ens` variable names from `@ensdomains/ens`. Only the newer contracts (TNSRegistry, ReverseRegistrar, Resolver, PaymentForwarder) use the `TNS` type and `tns` variable. The contract set includes: `TNSRegistry`, `BaseRegistrarImplementation` (ERC-721), `ETHRegistrarController` (commit-reveal with simplified `register`), `StablePriceOracle` (USD-based via `DSValue` oracle interface), `Root` (root node ownership with TLD locking), `ReverseRegistrar`, `Resolver`, and `PaymentForwarder`. Supporting contracts include `DummyOracle`, `SimplePriceOracle`, `SafeMath`, `StringUtils`, `Ownable`, and `Controllable`. Fees stay in the controller contract (owner can withdraw), matching the standard ENS pattern. Migrated domains are handled gracefully, ensuring address resolution and payment forwarding work even without resolver records.
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
- **Smart Contract Addresses (V3 — deployed March 2026)**:
  - TNS Registry: `0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e`
  - Base Registrar (ERC-721): `0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629`
  - Controller: `0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80`
  - Resolver: `0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b`
  - Reverse Registrar: `0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080`
  - Price Oracle (Stable): `0x77C5F276dd8f7321E42580AC53E73859C080A0f2`
  - Dummy Oracle: `0x903cc70Cda037249e8D1870Bcd6C528710B73b7E`
  - Payment Forwarder: `0xF661722f065D8606CC6b5be84296D67D9fe7bD13`
  - Root: `0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24`
  - Intuition EthMultiVault (Proxy): `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e`
- **V1/V2 (deprecated)**: All previous contract addresses are deprecated. V3 deployed March 2026 with ENS-matching naming.
- **Migration**: All 143 domains (111 unique holders) successfully migrated to V3 contracts with preserved ownership and expiry dates. Fees stay in controller, owner can withdraw. V1 and V2 controllers permanently disabled.
- **Wallet Integration**: MetaMask
- **Smart Contract Libraries**: OpenZeppelin
- **Styling Framework**: Tailwind CSS
- **UI Component Library**: shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter