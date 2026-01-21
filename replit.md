# Trust Name Service (TNS)

## Overview
The Trust Name Service (TNS) is a decentralized naming service for the Intuition mainnet, akin to ENS. It enables users to register human-readable `.trust` domain names that map to blockchain addresses and other resources. Key capabilities include domain registration, address resolution, payment forwarding, reverse resolution, domain renewal, hierarchical domains, and NFT ownership of domains. The project aims to provide a robust and user-friendly naming solution for the Intuition ecosystem.

## User Preferences
- Focus on clean, intuitive UI similar to ENS
- Emphasize the `.trust` branding
- Include clear pricing display
- Implement domain search functionality

## System Architecture
TNS is built around a robust architecture featuring smart contracts, a modern frontend, and a supporting backend API.

### UI/UX Decisions
The frontend prioritizes a clean, intuitive user experience, similar to ENS, with a strong emphasis on `.trust` branding. Key UI elements include:
- Domain search and registration interface with a clear 2-step commit-reveal process and countdown timer.
- Domain management dashboard for owners to configure resolvers, set primary domains, and renew registrations.
- "Send Payment" page for user-friendly token transfers to `.trust` domains.
- Reverse resolution display in the header, showing the primary domain instead of the wallet address for enhanced identity.
- Consistent pricing display across all relevant interfaces.

### Technical Implementations
- **Core Features**: Domain registration with a 2-step commit-reveal process (60-second minimum wait, 24-hour window), address resolution, payment forwarding, reverse resolution, domain extension/renewal with flexible duration options, and NFT ownership (ERC-721).
- **Security Features**: Front-running protection via commit-reveal, reentrancy protection on critical contract functions, 90-day grace period for expired domains (owner-only renewal), permissionless burn function for expired domain NFTs (after grace period), and on-chain primary domain storage with ownership verification.
- **Pricing**: Tiered pricing based on domain character length (3 chars: 100 TRUST/year, 4 chars: 70 TRUST/year, 5+ chars: 30 TRUST/year).
- **Metadata System**: Backend queries blockchain directly via ethers.js JsonRpcProvider to serve NFT metadata, ensuring accuracy and persistence across server restarts. No reliance on in-memory storage for NFT data.

### Feature Specifications
- **Domain Registration**: Utilizes a commit-reveal scheme to prevent front-running.
- **Payment Forwarding**: Allows direct TRUST token transfers to `.trust` domain names on-chain, resolving to the appropriate address via the TNSResolver.
- **Reverse Resolution**: Enables users to set a primary domain that is displayed across the platform instead of their wallet address.
- **Domain Management**: Owners can set resolver records (ETH address, IPFS hash, text records), upload domain images directly from their device, and manage primary domain status.
- **Domain Image Upload**: Users can upload images directly from their device using Replit Object Storage. Images are stored securely and linked to domains via the resolver's avatar text record.
- **Domain Renewal**: Users can extend domain registrations with real-time cost calculation and grace period handling.
- **NFT Metadata**: ERC-721 compliant metadata system for domain NFTs with:
  - Dynamic SVG image generation with tier-based color gradients (Gold for 3-char, Blue for 4-char, Purple for 5+ char)
  - Metadata endpoint: `/api/metadata/{tokenId}` returns JSON with name, description, image, external_url, and attributes
  - Image endpoint: `/api/metadata/{tokenId}/image` returns dynamically generated SVG
  - Attributes: Domain Length, Character Set, Pricing Tier, Price Per Year, Registration Date, Expiration Date
  - Base URI configured in contract: `https://tns.intuition.box/api/metadata/`
  - Full marketplace compatibility (OpenSea, Rarible, etc.)

**Note**: Subdomain functionality has been removed from the application per user request.

### System Design Choices

#### ENS-Forked Smart Contracts (New Architecture)
The smart contracts have been refactored to fork the battle-tested ENS (Ethereum Name Service) architecture, adapted for TRUST token payments on Intuition:

- **TNSRegistry** (`contracts/ens/TNSRegistry.sol`): Core registry mapping domain namehashes to owners, resolvers, and TTLs. Forked from ENS Registry.
- **TNSBaseRegistrar** (`contracts/ens/TNSBaseRegistrar.sol`): ERC-721 registrar that owns the `.trust` TLD. Handles domain minting, expiry tracking, and controller authorization. Forked from ENS BaseRegistrarImplementation.
- **TNSController** (`contracts/ens/TNSController.sol`): Registration controller with commit-reveal (60s min, 24h max) and TRUST ERC-20 token payments. Forked from ETHRegistrarController.
- **TNSResolver** (`contracts/ens/TNSResolver.sol`): Public resolver supporting addresses, text records, contenthash, and name records. Simplified from ENS PublicResolver.
- **TNSReverseRegistrar** (`contracts/ens/TNSReverseRegistrar.sol`): Handles reverse resolution (address → name). Forked from ENS ReverseRegistrar.
- **TNSPriceOracle** (`contracts/ens/TNSPriceOracle.sol`): Tiered pricing oracle (3 char: 100 TRUST, 4 char: 70 TRUST, 5+: 30 TRUST).
- **TNSPaymentForwarder** (`contracts/ens/TNSPaymentForwarder.sol`): Enables on-chain payments to `.trust` domains using TRUST tokens.

#### Legacy Contracts (Deployed - To Be Migrated)
- **TNSRegistryERC721**: `0x7C365AF9034b00dadc616dE7f38221C678D423Fa`
- **TNSResolver**: `0x490a0B0EAD6B1da1C7810ACBc9574D7429880F06`
- **PaymentForwarder**: `0x640E4fD39A2f7f65BBB344988eFF7470A98E2547`

#### Deployment & Migration
- Deployment script: `contracts/ens/deploy.ts`
- Migration script: `contracts/ens/migrate.ts`
- See `contracts/ens/README.md` for full deployment order and setup instructions

- **Frontend**: React, TypeScript, Vite, Tailwind CSS + shadcn/ui, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, In-memory storage (MemStorage). Provides API for domain availability, registration processing, and user account management.

## Intuition Knowledge Graph Integration
TNS integrates with Intuition's decentralized Knowledge Graph to enable AI agent identity infrastructure.

### Integration Components
- **@0xintuition/graphql SDK**: Query atoms, triples, and signals from the Knowledge Graph
- **IntuitionService** (`server/intuition.ts`): Service module for Knowledge Graph operations
- **MCP Server** (`server/mcp-server.ts`): Model Context Protocol server for AI agent integration

### API Endpoints

#### Knowledge Graph Endpoints
- `GET /api/atom/:domain` - Get domain atom metadata (Schema.org format)
- `GET /api/domains/:name/graph` - Get domain knowledge graph relationships
- `GET /api/domains/:name/reputation` - Get domain reputation from Knowledge Graph
- `GET /api/knowledge-graph/atoms?uri=` - Search atoms by URI pattern
- `GET /api/knowledge-graph/atoms/:atomId` - Get specific atom by ID

#### Agent Registry Endpoints
- `POST /api/agents/register` - Register an AI agent with a .trust identity
- `GET /api/agents/:domain` - Resolve agent identity and metadata
- `GET /api/agents/discover?capability=&type=` - Discover agents by capability or type
- `GET /api/agents/directory` - List all registered agents
- `POST /api/agents/:domain/records` - Update agent-specific resolver records

### MCP Server Tools
The MCP server (`mcp.json`) exposes these tools for AI assistants:
- `resolve_domain` - Resolve a .trust domain to its owner and metadata
- `check_availability` - Check if a domain is available for registration
- `get_domain_reputation` - Get reputation score from Knowledge Graph
- `get_domain_graph` - Get knowledge graph relationships
- `discover_agents` - Find AI agents by capability
- `get_agent_info` - Get detailed agent information
- `get_pricing` - Get current domain pricing tiers
- `search_atoms` - Search atoms in the Knowledge Graph

### Agent Identity Schema
Agents registered with .trust domains store metadata including:
- `agentType`: assistant, analyzer, trader, validator
- `capabilities`: text-generation, code-review, data-analysis, etc.
- `endpoint`: API endpoint URL
- `publicKey`: For agent-to-agent authentication
- `version`: Semantic version

### Knowledge Graph Sync Endpoints
Domain sync endpoints to synchronize existing .trust domains to Intuition's Knowledge Graph:
- `GET /api/sync/user/:address` - Get user's domains with sync status (user-facing)
- `POST /api/sync/scan` - Scan blockchain for all registered domains and check sync status
- `GET /api/sync/status` - Get sync status summary for all domains
- `GET /api/sync/pending` - Get unsynced domains with prepared transaction data
- `POST /api/sync/prepare-batch` - Prepare batch transaction data for multiple domains
- `POST /api/sync/confirm` - Mark domain as synced after transaction confirmed
- `POST /api/sync/fail` - Mark domain sync as failed
- `GET /api/sync/check/:domain` - Check individual domain sync status

### Atom URI Format
Domain atoms use a simple domain name format in Intuition's Knowledge Graph:
- **Format**: `{domainName}.trust`
- **Example**: `samoris.trust`
- **Purpose**: Registers the domain name as an identity in the Knowledge Graph

This format:
- Uses the domain name directly as the atom URI
- Atom URI is stable regardless of ownership changes
- Allows reputation and staking features for domain identities

### Sync Workflow
1. User connects wallet on `/sync` page
2. System fetches user's domains from blockchain with sync status
3. For each unsynced domain, user clicks "Sync" to create atom transaction
4. Transaction creates CAIP-10 atom in Intuition's EthMultiVault
5. After transaction confirms, domain is synced and queryable in the Knowledge Graph

## External Dependencies
- **Blockchain Network**: Intuition mainnet (Chain ID: 1155, RPC URL: `https://intuition.calderachain.xyz`, Explorer URL: `https://explorer.intuition.systems`)
- **Smart Contract Addresses**: 
  - TNS Registry: `0x7C365AF9034b00dadc616dE7f38221C678D423Fa` (ERC-721 with NFT metadata support)
  - TNS Resolver: `0x490a0B0EAD6B1da1C7810ACBc9574D7429880F06`
  - Payment Forwarder: `0x640E4fD39A2f7f65BBB344988eFF7470A98E2547`
  - Intuition EthMultiVault (Proxy): `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e` (Knowledge Graph - TransparentUpgradeableProxy)
  - Intuition MultiVault (Implementation): `0xc6f28A5fFe30eee3fadE5080B8930C58187F4903`
- **Wallet Integration**: MetaMask
- **Smart Contract Libraries**: OpenZeppelin (for ERC-721, Ownable, ReentrancyGuard)
- **Styling Framework**: Tailwind CSS
- **UI Component Library**: shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter