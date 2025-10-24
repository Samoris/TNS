# Trust Name Service (TNS)

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
- **Payment forwarding** - Send TRUST tokens directly to .trust domain names on-chain
- **Reverse resolution** - Display primary domain instead of wallet address
- Hierarchical domain structure (subdomains)
- NFT ownership of domains (ERC-721 tokens with OpenZeppelin standard)
- Multi-resource support (addresses, IPFS hashes, text records)
- Front-running protection via commit-reveal scheme
- Reentrancy protection on all critical functions
- 60-second minimum wait between commitment and registration
- **30-day grace period** for expired domains (owner can renew, prevents immediate re-registration)
- Permissionless burn function for expired domain NFTs (after grace period)
- Primary domain selection (users can set one domain as their main identity)

## Pricing Structure
- **5+ characters**: 30 TRUST per year
- **4 characters**: 70 TRUST per year
- **3 characters**: 100 TRUST per year

## Architecture
### Smart Contracts (ERC-721 NFT)
- **TNSRegistryERC721**: Main registry contract inheriting OpenZeppelin ERC721, Ownable, and ReentrancyGuard
  - Mints actual ERC-721 NFT for each domain
  - Implements commit-reveal registration (makeCommitment + register)
  - Includes reentrancy protection and front-running protection
  - Supports domain renewal with overflow protection
  - Manages per-domain resolver assignment (setResolver/resolver functions)
  - Full marketplace compatibility (OpenSea, Rarible, etc.)

- **TNSResolver**: Separate resolver contract for storing resolution data
  - Stores ETH addresses for domains (setAddr/addr)
  - Stores content hashes for IPFS/IPNS (setContenthash/contenthash)
  - Stores text records for metadata (setText/text)
  - Supports standard text keys: email, url, avatar, description, social media handles
  - Authorization enforced via Registry contract (only domain owners can update)
  - Returns zero values for expired domains

- **TNSPaymentForwarder**: Payment gateway contract for sending funds to domains
  - Resolves .trust domains to payment addresses on-chain
  - Automatically uses resolver address if set, otherwise domain owner
  - Validates domain existence and expiration before transfer
  - Includes reentrancy protection via OpenZeppelin ReentrancyGuard
  - Emits PaymentSent and PaymentFailed events for tracking
  - Supports batch resolution for multiple domains

### Frontend Components
- Domain search and registration interface
- Domain management dashboard
- Address resolution functionality
- Subdomain management
- **Send Payment page** - User-friendly interface for sending TRUST to .trust domains
- **Reverse resolution in header** - Displays primary domain instead of wallet address

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
- [✓] **Payment Forwarder Contract** (TNSPaymentForwarder.sol with reentrancy protection)
- [✓] **Send Payment Page** (Resolve domains and send TRUST tokens on-chain)
- [✓] **Reverse Resolution** (Display primary domain in wallet button and header)

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
- 2025-10-14: **Added Primary Domain Feature**:
  - Users can now set one of their domains as "primary" to represent their main identity
  - Primary domain badge displayed on domain cards and in manage page header
  - "Set as Primary Domain" button in domain management dialog
  - Only one domain per owner can be primary (automatically unsets previous primary)
  - Backend API endpoint `/api/domains/:name/set-primary` with ownership validation
- 2025-10-14: **Updated Contract Addresses**:
  - Registry contract address: `0xdfe1aB8532925de628C419B65B41f23997c34B4a`
  - Resolver contract address: `0x259037FCc807Ca46549e8a15F6F4994e96D88035`
  - All frontend references updated to use new deployments with resolver support
- 2025-10-14: **Fixed MetaMask Rejection Error**:
  - Enhanced global error handler to gracefully handle user transaction rejections
  - MetaMask cancellations (error code 4001) no longer trigger error overlay
  - User rejections logged quietly without interrupting the UI
- 2025-10-14: **Updated Pricing Structure**:
  - Fixed backend pricing tiers in shared/schema.ts and server/routes.ts
  - Updated pricing: 5+ chars (30 TRUST), 4 chars (70 TRUST), 3 chars (100 TRUST)
  - Backend and frontend now use consistent pricing across all components
- 2025-10-14: **Primary Domain Now Uses Blockchain Transaction**:
  - Added setPrimaryDomain() and getPrimaryDomain() functions to TNSRegistryERC721.sol
  - Primary domain status now stored on-chain instead of backend database
  - Added PrimaryDomainSet event for blockchain tracking
  - Frontend calls blockchain transaction via web3Service.setPrimaryDomain()
  - **Note**: Contract must be redeployed with new functions for this feature to work
  - New ABI includes setPrimaryDomain, getPrimaryDomain, and PrimaryDomainSet event
- 2025-10-14: **Added 30-Day Grace Period for Expired Domains**:
  - Expired domains enter a 30-day grace period where only the original owner can renew
  - Domains cannot be re-registered or burned during grace period
  - Added GRACE_PERIOD constant (30 days) to contract
  - Added isInGracePeriod() function to check if domain is in grace period
  - Updated isAvailable() to return false for domains in grace period
  - Updated register() to reject domains in grace period
  - Updated renew() to allow renewal during grace period by original owner
  - Updated burnExpiredDomain() to only allow burning after grace period ends
- 2025-10-14: **Reverted to Fixed TRUST Pricing**:
  - Removed USD-based pricing system
  - Restored simple fixed pricing: 30/70/100 TRUST per year
  - Removed maxCost slippage protection (not needed for fixed pricing)
  - Simplified calculateCost() function back to pure fixed calculation
- 2025-10-14: **Implemented Resolver Contract Architecture**:
  - Created TNSResolver.sol contract for storing resolution data (addresses, content hashes, text records)
  - Added setResolver/resolver functions to TNSRegistryERC721 for per-domain resolver assignment
  - Resolver supports: ETH addresses (setAddr/addr), IPFS content hashes (setContenthash/contenthash), text records (setText/text)
  - Supported text keys: email, url, avatar, description, social media handles (Twitter, GitHub, Discord, etc.)
  - Authorization enforced via Registry contract - only domain owners can update their records
  - Returns zero values for expired domains automatically
  - Frontend web3 service updated with complete resolver functions
  - **Security**: Added ReentrancyGuard to all state-changing functions (setAddr, setText, setContenthash, clearRecords)
  - **Traceability**: Enhanced clearRecords to emit per-key events (AddressChanged, ContenthashChanged, TextChanged) for better audit trail
  - **Note**: Resolver contract must be deployed and address updated in contracts.ts
- 2025-10-14: **Implemented Resolver Management UI**:
  - Added complete resolver settings section to domain management dialog
  - Three dedicated forms: ETH address resolution, text records, and IPFS content hash
  - **Comprehensive Validation**:
    - ETH address: Format validation (0x + 40 hex chars) with red border and inline error messages
    - Text records: Empty/whitespace-only value detection with visual feedback
    - Content hash: Format validation (0x, Qm, or bafy prefixes) with inline error messages
  - **User Experience Features**:
    - Cancel buttons always enabled for immediate form exit
    - Submit buttons disabled when input is invalid or empty
    - Loading states during blockchain transactions
    - Toast notifications for success and error states
  - **Error Handling**:
    - User-facing toast notifications when resolver data fails to load
    - Graceful handling of MetaMask transaction rejections
    - Form state reset on successful mutations
  - **Architecture Review**: Implementation verified by architect as production-ready with all validation, error handling, and UX requirements met
- 2025-10-24: **Implemented Payment Forwarding System**:
  - Created TNSPaymentForwarder.sol smart contract for on-chain payments to .trust domains
  - Contract resolves domains to payment addresses (uses resolver address if set, otherwise domain owner)
  - Includes reentrancy protection and domain validation (existence and expiration checks)
  - Emits PaymentSent event with domain, recipient, sender, and amount
  - Added web3 service functions: resolvePaymentAddress() and sendToTrustDomain()
  - Created Send Payment page with domain resolution and amount validation
  - **UI Features**:
    - Resolve button to verify domain and get payment address before sending
    - Visual confirmation of resolved address with green checkmark
    - Amount input with TRUST token validation
    - Error handling for invalid domains, expired domains, and failed transactions
  - **Note**: Payment Forwarder contract must be deployed and address updated in contracts.ts
- 2025-10-24: **Implemented Reverse Resolution (Address to Domain)**:
  - Added getPrimaryDomain() web3 service function to query primary domain by address
  - Header now displays primary domain (e.g., "intuition.trust") instead of truncated address
  - Crown icon indicates primary domain in wallet dropdown
  - Automatic fallback to formatted address when no primary domain is set
  - Query updates every 5 seconds to keep display current
  - **Benefits**: Users can identify themselves by their primary domain across the platform

## Security Considerations
- **Primary Domain Security**: Primary domain status is now stored on-chain and requires ownership verification by the smart contract, preventing unauthorized changes.
- **Resolver Authorization**: All resolver record updates require domain ownership verification through the Registry contract, preventing unauthorized modifications.
- **Payment Forwarder Security**: TNSPaymentForwarder includes reentrancy protection, validates domain ownership and expiration, and emits events for all payment attempts. Payments cannot be misrouted as the contract validates the domain exists and is not expired before transferring funds.