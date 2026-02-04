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
- **Domain Image Upload**: Images are uploaded to Replit Object Storage and linked via resolver's avatar text record.
- **Domain Renewal**: Flexible duration options with real-time cost calculation.
- **NFT Metadata**: ERC-721 compliant metadata with dynamic SVG images and attributes like domain length, pricing tier, and dates.

### System Design Choices
The smart contracts are forked from ENS, adapted for TRUST token payments on Intuition. This includes `TNSRegistry`, `TNSBaseRegistrar` (ERC-721), `TNSController` (with commit-reveal and TRUST payments), `TNSResolver`, `TNSReverseRegistrar`, `TNSPriceOracle` (tiered pricing), and `TNSPaymentForwarder`. Migrated domains are handled gracefully, ensuring address resolution and payment forwarding work even without resolver records.
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
- **Smart Contract Addresses**: TNS Registry, Base Registrar (ERC-721), Controller, Resolver, Reverse Registrar, Price Oracle, Payment Forwarder, Treasury, Intuition EthMultiVault (Proxy), Intuition MultiVault (Implementation).
- **Wallet Integration**: MetaMask
- **Smart Contract Libraries**: OpenZeppelin
- **Styling Framework**: Tailwind CSS
- **UI Component Library**: shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter