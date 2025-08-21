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
- Domain registration with `.trust` extension
- Address resolution (map domains to wallet addresses)
- Hierarchical domain structure (subdomains)
- NFT ownership of domains (ERC-721 tokens)
- Multi-resource support (addresses, IPFS hashes, etc.)

## Pricing Structure
- **5+ characters**: 0.02 TRUST/year
- **4 characters**: 0.1 TRUST/year  
- **3 characters**: 2 TRUST/year

## Architecture
### Smart Contracts (Simulated)
- **TNS Registry**: Core contract maintaining domain ownership and resolvers
- **TNS Registrar**: Handles domain registration and renewals
- **TNS Resolver**: Maps domains to addresses and other resources

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
- [✓] Simplified direct registration process (removed commit-reveal)
- [✓] Domain management dashboard
- [✓] Subdomain creation and management
- [✓] **Gas-optimized smart contract deployment** (User Deployed: 0xb4D38068F8982c15CaD9f98adE6C2954567e2153)
- [✓] **Real blockchain transactions enabled** (Replaced demo mode)
- [✓] **Deployable contract code provided** (Ready for user deployment)

## User Preferences
- Focus on clean, intuitive UI similar to ENS
- Emphasize the `.trust` branding
- Include clear pricing display
- Implement domain search functionality

## Recent Changes
- 2025-01-21: Project initialized with TNS specifications
- 2025-01-21: Defined pricing structure and network configuration
- 2025-01-21: **User deployed production contract** (0xb4D38068F8982c15CaD9f98adE6C2954567e2153)
- 2025-01-21: **Enabled real blockchain transactions** - replaced demo mode with actual on-chain registration
- 2025-01-21: **Fixed wallet connection issues** - removed debugging logs and streamlined connection flow
- 2025-01-21: **Created deployable contract** - provided complete smart contract code ready for user deployment
- 2025-01-21: **Removed demo mode messaging** - cleaned up frontend to show production-ready interface