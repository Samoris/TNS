# Trust Name Service (TNS)

## Overview
The Trust Name Service (TNS) is a decentralized naming service for the Intuition testnet, akin to ENS. It enables users to register human-readable `.trust` domain names that map to blockchain addresses and other resources. Key capabilities include domain registration, address resolution, payment forwarding, reverse resolution, domain renewal, hierarchical domains, and NFT ownership of domains. The project aims to provide a robust and user-friendly naming solution for the Intuition ecosystem.

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
- **Core Features**: Domain registration with a 2-step commit-reveal process (60-second minimum wait, 24-hour window), address resolution, payment forwarding, reverse resolution, domain extension/renewal with flexible duration options, subdomain support, and NFT ownership (ERC-721).
- **Security Features**: Front-running protection via commit-reveal, reentrancy protection on critical contract functions, 30-day grace period for expired domains (owner-only renewal), permissionless burn function for expired domain NFTs (after grace period), and on-chain primary domain storage with ownership verification.
- **Pricing**: Tiered pricing based on domain character length (3 chars: 100 TRUST/year, 4 chars: 70 TRUST/year, 5+ chars: 30 TRUST/year).

### Feature Specifications
- **Domain Registration**: Utilizes a commit-reveal scheme to prevent front-running.
- **Payment Forwarding**: Allows direct TRUST token transfers to `.trust` domain names on-chain, resolving to the appropriate address via the TNSResolver.
- **Reverse Resolution**: Enables users to set a primary domain that is displayed across the platform instead of their wallet address.
- **Domain Management**: Owners can set resolver records (ETH address, IPFS hash, text records) and manage primary domain status.
- **Domain Renewal**: Users can extend domain registrations with real-time cost calculation and grace period handling.

### System Design Choices
- **Smart Contracts**:
    - **TNSRegistryERC721**: Main registry, handles domain registration (minting ERC-721 NFTs), renewal, and ownership. Inherits OpenZeppelin ERC721, Ownable, and ReentrancyGuard. Manages per-domain resolver assignment.
    - **TNSResolver**: Stores resolution data (ETH addresses, IPFS hashes, text records) for domains. Authorization enforced by the Registry contract. Returns zero values for expired domains. Includes ReentrancyGuard.
    - **TNSPaymentForwarder**: Enables on-chain payments to `.trust` domains, resolving addresses via the TNSResolver. Includes reentrancy protection and domain validation.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS + shadcn/ui, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, In-memory storage (MemStorage). Provides API for domain availability, registration processing, and user account management.

## External Dependencies
- **Blockchain Network**: Intuition testnet (Chain ID: 13579, RPC URL: `https://testnet.rpc.intuition.systems`, Explorer URL: `https://testnet.explorer.intuition.systems`)
- **Wallet Integration**: MetaMask
- **Smart Contract Libraries**: OpenZeppelin (for ERC-721, Ownable, ReentrancyGuard)
- **Styling Framework**: Tailwind CSS
- **UI Component Library**: shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter

## Recent Changes
- **Whitelist Feature** (October 28, 2025): Added admin interface at `/admin` for managing free domain minting. Contract owner can whitelist addresses with configurable free mint quotas. New smart contract: `contracts/TNSRegistryERC721_Whitelist.sol`. See `docs/WHITELIST_GUIDE.md` for complete documentation.
- **Documentation Pages**: Added Privacy Policy (`/privacy`), Terms of Service (`/terms`), and Support Center (`/support`) pages
- **Comprehensive Documentation**: Created TNS Documentation page at `/docs` with detailed guides for all features
- **Domain Extension**: Fixed and tested domain renewal functionality - successfully extended domains with correct year-based duration