# Trust Naming Service (TNS)

## Project Overview
A decentralized naming service similar to ENS (Ethereum Name Service) built for the Intuition testnet. TNS allows users to register human-readable `.trust` domain names that map to blockchain addresses and other resources.

## Network Configuration
- **Chain ID**: 13579
- **Network Name**: Intuition testnet  
- **RPC URL**: https://testnet.rpc.intuition.systems
- **Currency Symbol**: TRUST
- **Explorer URL**: https://testnet.explorer.intuition.systems

## Core Features
- Domain registration with `.trust` extension (2-step commit-reveal process)
- Address resolution (map domains to wallet addresses)
- Hierarchical domain structure (subdomains)
- NFT ownership of domains (ERC-721 tokens with OpenZeppelin standard)
- Multi-resource support (addresses, IPFS hashes, etc.)
- Front-running protection via commit-reveal scheme
- Reentrancy protection on all critical functions
- 60-second minimum wait between commitment and registration
- Permissionless burn function for expired domain NFTs

## Pricing Structure
- **5+ characters**: 0.02 TRUST/year
- **4 characters**: 0.1 TRUST/year  
- **3 characters**: 2 TRUST/year

## Architecture
### Smart Contracts (ERC-721 NFT)
- **TNSRegistryERC721**: Main contract inheriting OpenZeppelin ERC721, Ownable, and ReentrancyGuard
  - Mints actual ERC-721 NFT for each domain
  - Implements commit-reveal registration (makeCommitment + register)
  - Includes reentrancy protection and front-running prevention
  - Supports domain renewal with overflow protection
  - Maps domains to addresses and other resources
  - Full marketplace compatibility (OpenSea, Rarible, etc.)

### Frontend Components
- Domain search and registration interface
- Domain management dashboard
- Address resolution functionality
- Subdomain management

### Backend API
- Domain availability checking
- Registration processing
- Resolution services
- User account management

## Technology Stack
- Frontend: React + TypeScript + Vite
- Backend: Express.js + TypeScript
- Storage: In-memory (MemStorage)
- Styling: Tailwind CSS + shadcn/ui
- State Management: TanStack Query
- Routing: Wouter

## Development Status
- [✓] Initial project setup completed
- [✓] Data model design implemented
- [✓] Core architecture implementation completed  
- [✓] Domain search and registration frontend
- [✓] Wallet integration with MetaMask
- [✓] Domain management dashboard
- [✓] Subdomain creation and management
- [✓] **ERC-721 NFT Contract** (TNSRegistryERC721.sol with OpenZeppelin)
- [✓] **Security Features** (Reentrancy guard, front-running protection, overflow checks)
- [✓] **2-Step Commit-Reveal Registration** (60-second wait, 24-hour window)
- [✓] **Frontend Commit-Reveal UI** (Countdown timer, clear 2-step process)
- [✓] **Real blockchain transactions enabled** (Actual NFT minting on-chain)

## User Preferences
- Focus on clean, intuitive UI similar to ENS
- Emphasize the `.trust` branding
- Include clear pricing display
- Implement domain search functionality

## Recent Changes
- 2025-01-21: Project initialized with TNS specifications
- 2025-01-21: Defined pricing structure and network configuration
- 2025-10-14: **Implemented ERC-721 NFT Contract** - TNSRegistryERC721.sol with OpenZeppelin standard for actual NFT minting
- 2025-10-14: **Added Security Features**:
  - ReentrancyGuard on withdraw(), register(), and renew() functions
  - Commit-reveal scheme to prevent front-running attacks
  - Integer overflow checks in duration calculations
  - Restricted receive() function to only accept payments during registration
- 2025-10-14: **Implemented 2-Step Registration Flow**:
  - Step 1: makeCommitment() to create secure hash with secret
  - 60-second minimum wait period between commitment and registration
  - Step 2: register() with secret to mint ERC-721 NFT
  - 24-hour maximum window to complete registration
- 2025-10-14: **Updated Frontend UI**:
  - Added commitment state management with secret, hash, and timestamp
  - Implemented countdown timer showing remaining wait time
  - Clear visual indicators for 2-step process
  - Progress bar and status messages for user feedback
- 2025-10-14: **Added Burn Function for Expired Domains**:
  - Permissionless burnExpiredDomain() function - anyone can burn expired NFTs
  - Completely removes domain data and burns NFT to free up domain name
  - Added "Burn NFT" button in UI for expired domains
  - Proper cache invalidation to refresh domain list after burn
  - DomainBurned event emitted on successful burn