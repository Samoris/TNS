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
- **Security Features**: Front-running protection via commit-reveal, reentrancy protection on critical contract functions, 30-day grace period for expired domains (owner-only renewal), permissionless burn function for expired domain NFTs (after grace period), and on-chain primary domain storage with ownership verification.
- **Pricing**: Tiered pricing based on domain character length (3 chars: 100 TRUST/year, 4 chars: 70 TRUST/year, 5+ chars: 30 TRUST/year).
- **Metadata System**: Backend queries blockchain directly via ethers.js JsonRpcProvider to serve NFT metadata, ensuring accuracy and persistence across server restarts. No reliance on in-memory storage for NFT data.

### Feature Specifications
- **Domain Registration**: Utilizes a commit-reveal scheme to prevent front-running.
- **Payment Forwarding**: Allows direct TRUST token transfers to `.trust` domain names on-chain, resolving to the appropriate address via the TNSResolver.
- **Reverse Resolution**: Enables users to set a primary domain that is displayed across the platform instead of their wallet address.
- **Domain Management**: Owners can set resolver records (ETH address, IPFS hash, text records) and manage primary domain status.
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
- **Smart Contracts**:
    - **TNSRegistryERC721**: Main registry, handles domain registration (minting ERC-721 NFTs), renewal, and ownership. Inherits OpenZeppelin ERC721, Ownable, and ReentrancyGuard. Manages per-domain resolver assignment.
    - **TNSResolver**: Stores resolution data (ETH addresses, IPFS hashes, text records) for domains. Authorization enforced by the Registry contract. Returns zero values for expired domains. Includes ReentrancyGuard.
    - **TNSPaymentForwarder**: Enables on-chain payments to `.trust` domains, resolving addresses via the TNSResolver. Includes reentrancy protection and domain validation.
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
- `POST /api/sync/scan` - Scan blockchain for all registered domains and check sync status
- `GET /api/sync/status` - Get sync status summary for all domains
- `GET /api/sync/pending` - Get unsynced domains with prepared transaction data
- `POST /api/sync/prepare-batch` - Prepare batch transaction data for multiple domains
- `POST /api/sync/confirm` - Mark domain as synced after transaction confirmed
- `POST /api/sync/fail` - Mark domain sync as failed
- `GET /api/sync/check/:domain` - Check individual domain sync status

### Sync Workflow
1. Call `POST /api/sync/scan` to scan blockchain and identify unsynced domains
2. Get pending domains from `GET /api/sync/pending` with ready-to-sign transactions
3. User signs and submits atom creation transactions to Intuition's EthMultiVault
4. After transaction confirms, call `POST /api/sync/confirm` with atomId and txHash
5. Domain is now synced and queryable in the Knowledge Graph

## External Dependencies
- **Blockchain Network**: Intuition mainnet (Chain ID: 1155, RPC URL: `https://intuition.calderachain.xyz`, Explorer URL: `https://explorer.intuition.systems`)
- **Smart Contract Addresses**: 
  - TNS Registry: `0x7C365AF9034b00dadc616dE7f38221C678D423Fa` (ERC-721 with NFT metadata support)
  - TNS Resolver: `0x490a0B0EAD6B1da1C7810ACBc9574D7429880F06`
  - Payment Forwarder: `0x640E4fD39A2f7f65BBB344988eFF7470A98E2547`
- **Wallet Integration**: MetaMask
- **Smart Contract Libraries**: OpenZeppelin (for ERC-721, Ownable, ReentrancyGuard)
- **Styling Framework**: Tailwind CSS
- **UI Component Library**: shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter