# Trust Name Service (TNS) - Intuition Grant Application

---

## 1. Applicant & Project Overview

### Required

**Project Name:**  
Trust Name Service (TNS)

**Team / Individual Name(s):**  
[Your Name / Team Name]

**Links (Website, GitHub, Demo, Socials):**
- Website: https://tns.intuition.box
- Demo: https://tns.intuition.box
- GitHub: [Your GitHub Repository URL]
- Explorer: https://explorer.intuition.systems

**100-Word Summary:**  
Trust Name Service (TNS) is a decentralized naming service for the Intuition mainnet, similar to ENS but native to the TRUST ecosystem. TNS enables users to register human-readable `.trust` domain names (e.g., `alice.trust`) that map to blockchain addresses, enabling seamless identity, payments, and resolution. Key features include ERC-721 NFT domain ownership, front-running protection via commit-reveal registration, on-chain payment forwarding to domain names, reverse resolution for identity display, tiered pricing based on domain length, and full NFT marketplace compatibility. TNS is live on Intuition mainnet with deployed smart contracts and a fully functional web application.

**Project Category:**  
- [x] Identity / DID / Reputation
- [x] Registry
- [x] Consumer App

### Optional

**Elevator pitch (1–2 sentences):**  
TNS brings human-readable identity to Intuition—replacing cryptic wallet addresses with memorable `.trust` names that work for payments, identity, and decentralized applications. It's ENS for the TRUST ecosystem.

**Origin story:**  
The Intuition ecosystem needed a native naming solution that integrates deeply with TRUST tokenomics and the knowledge graph. Rather than relying on external naming services, TNS was built from the ground up to leverage Intuition's unique infrastructure and provide a seamless identity layer for users and applications.

**Notable traction or achievements:**
- Live on Intuition mainnet with 5+ registered domains
- Three production smart contracts deployed and verified
- Full ERC-721 NFT implementation with marketplace compatibility
- Dynamic SVG metadata generation for domain NFTs
- Commit-reveal registration preventing front-running attacks

**Current users or early testers:**  
Early adopters on Intuition mainnet have registered domains including premium names. The system has processed multiple registration transactions with TRUST token payments.

---

## 2. What You're Building

### Required

**Problem Statement:**  
Blockchain addresses are 42-character hexadecimal strings that are impossible to remember, easy to mistype, and provide no human context. Users sending payments must copy-paste addresses carefully, with any error potentially resulting in permanent loss of funds. There's no native identity layer on Intuition for users to establish memorable, verifiable on-chain identities.

**Proposed Solution:**  
TNS provides a complete naming infrastructure for Intuition:

1. **Domain Registration**: Register `.trust` domains (e.g., `alice.trust`) as ERC-721 NFTs with tiered annual pricing
2. **Address Resolution**: Resolve any `.trust` domain to its owner's wallet address
3. **Payment Forwarding**: Send TRUST tokens directly to domain names via on-chain forwarding contract
4. **Reverse Resolution**: Set a primary domain that displays instead of your wallet address
5. **Domain Management**: Configure resolver records, renew registrations, transfer ownership
6. **NFT Ownership**: Domains are tradeable ERC-721 NFTs with dynamic metadata and marketplace compatibility

**Stage of Development:**  
**Live** - Production smart contracts deployed on Intuition mainnet with fully functional web application.

### Optional

**Technical architecture overview:**

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React/Vite)                   │
│  - Domain Search & Registration UI                          │
│  - Wallet Connection (MetaMask)                             │
│  - Domain Management Dashboard                              │
│  - Payment Forwarding Interface                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                      │
│  - NFT Metadata API (/api/metadata/{tokenId})               │
│  - Dynamic SVG Generation                                    │
│  - Domain Availability Checking                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Intuition Mainnet (Chain ID: 1155)             │
├─────────────────────────────────────────────────────────────┤
│  TNSRegistryERC721        │  Main registry, ERC-721 NFTs    │
│  0x7C365AF9034b00dadc...  │  Domain registration & renewal  │
├─────────────────────────────────────────────────────────────┤
│  TNSResolver              │  Resolution data storage        │
│  0x490a0B0EAD6B1da1C7...  │  ETH address, IPFS, text records│
├─────────────────────────────────────────────────────────────┤
│  TNSPaymentForwarder      │  On-chain payment routing       │
│  0x640E4fD39A2f7f65BB...  │  Send TRUST to .trust domains   │
└─────────────────────────────────────────────────────────────┘
```

**Integrations or dependencies:**
- OpenZeppelin Contracts (ERC-721, Ownable, ReentrancyGuard)
- ethers.js for blockchain interaction
- Intuition mainnet RPC (https://intuition.calderachain.xyz)
- MetaMask for wallet connection

**Security considerations:**
- **Front-running Protection**: 2-step commit-reveal registration with 60-second minimum wait
- **Reentrancy Guards**: All payment and state-changing functions protected
- **Grace Period**: 30-day grace period for expired domains (owner-only renewal)
- **Permissionless Cleanup**: Anyone can burn expired domain NFTs after grace period
- **Ownership Verification**: On-chain primary domain storage with ownership checks

---

## 3. Team & Execution Ability

### Required

**Team backgrounds:**  
[Describe your team's background in blockchain development, smart contract security, and frontend development]

**Execution proof:**
- **Live Deployed Contracts**: Three production smart contracts on Intuition mainnet
- **Working Application**: Fully functional web application at tns.intuition.box
- **Real Transactions**: Multiple domain registrations processed with TRUST payments
- **NFT Integration**: Complete ERC-721 implementation with dynamic metadata

**Commitment level:**  
[Full time / Part time] - Dedicated to expanding TNS functionality and ecosystem integration

### Optional

**Prior crypto / AI experience relevant to the project:**
- Smart contract development (Solidity, OpenZeppelin)
- ERC-721 NFT implementation and metadata standards
- DeFi and naming service protocols (ENS architecture study)
- Frontend Web3 integration (ethers.js, wallet connections)

---

## 4. Grant Request & Milestones

### Required

**Amount requested:**  
[Specify amount in USD and/or TRUST]

**Budget breakdown by milestones:**

| Milestone | Description | Budget | Timeline |
|-----------|-------------|--------|----------|
| M1 | Subdomain Support & Hierarchical Domains | [Amount] | 4 weeks |
| M2 | Knowledge Graph Integration | [Amount] | 4 weeks |
| M3 | Agent Registry Integration | [Amount] | 4 weeks |
| M4 | Mobile App & Advanced Features | [Amount] | 6 weeks |

**Expected Timeline milestones you will deliver:**

**Milestone 1: Subdomain Support (Month 1)**
- Implement subdomain registration (e.g., `app.alice.trust`)
- Parent domain owner controls subdomain creation
- Subdomain resolver inheritance and override

**Milestone 2: Knowledge Graph Integration (Month 2)**
- Create atoms for each registered domain
- Establish triples linking domains to owners, resolvers, metadata
- Enable attestations on domain reputation/verification

**Milestone 3: Agent Registry Integration (Month 3)**
- Enable AI agents to register and resolve `.trust` identities
- Implement agent-to-agent discovery via domain names
- Add MCP context for agent interactions

**Milestone 4: Advanced Features (Months 4-5)**
- Mobile-responsive PWA with WCAG 2.1 AAA accessibility
- Bulk domain management tools
- Premium domain auctions
- Domain transfer marketplace

**Success criteria for each milestone:**
- M1: Users can register and manage subdomains; parent owners control permissions
- M2: Every domain creates corresponding atoms/triples in knowledge graph
- M3: Agents can register identities and discover other agents via TNS
- M4: Mobile users can fully manage domains; accessibility audit passed

### Optional

**How this work compounds value for the network:**
- Every domain registration locks TRUST tokens (burned or held)
- Increases knowledge graph density with identity atoms
- Provides identity infrastructure for all Intuition applications
- Enables human-readable agent discovery and communication

---

## 5. Intuition Ecosystem Alignment

### Required

**Why Intuition:**  
TNS is built exclusively for Intuition mainnet, leveraging TRUST as the native payment currency and integrating with the knowledge graph for rich identity attestations. The `.trust` TLD creates strong brand alignment with the Intuition ecosystem, and the naming infrastructure provides essential identity primitives for users, applications, and AI agents.

**Which Intuition primitives you use:**
- **TRUST Token**: All domain registrations paid in TRUST
- **Knowledge Graph**: Domains as atoms with owner/resolver triples
- **Registry**: TNS serves as the authoritative naming registry
- **Identity/DID**: Domains provide human-readable decentralized identifiers
- **Agent Registry**: Agents can claim `.trust` identities for discovery

**Why it must be built on Intuition:**
- Native TRUST token integration for all transactions
- Deep knowledge graph integration for identity attestations
- Essential infrastructure for the Intuition ecosystem
- `.trust` TLD branding exclusive to Intuition

### Optional

**Data structure plan (atoms, triples, signal, schemas):**
```
Atom: alice.trust (Domain)
  ├── Triple: (alice.trust, owner, 0x123...)
  ├── Triple: (alice.trust, resolver, 0x456...)
  ├── Triple: (alice.trust, expirationDate, 2025-11-05)
  ├── Triple: (alice.trust, registrationDate, 2024-11-05)
  └── Triple: (alice.trust, pricingTier, "5+ characters")
```

**How do you plan to integrate TRUST:**
- Domain registration fees paid in TRUST (30-100 TRUST/year based on length)
- Renewal payments in TRUST
- Payment forwarding enables sending TRUST to domain names
- Future: Premium domain auctions in TRUST

**New schemas, patterns, or agent types:**
- Domain ownership schema with expiration and renewal tracking
- Resolver record schema (address, IPFS, text records)
- Agent identity schema linking AI agents to `.trust` domains

**How this increases network activity or knowledge density:**
- Each domain registration adds atoms and triples to knowledge graph
- Resolver updates create additional attestations
- Domain transfers update ownership triples
- Agent registrations expand the identity layer

**Long-term contribution to the ecosystem (12–24 months):**
- Universal identity layer for all Intuition applications
- Agent-to-agent discovery and communication infrastructure
- Premium domain marketplace generating TRUST volume
- Integration with DIDs for verifiable credentials

---

## 6. Sustainability & Long-Term Vision

### Required

**Long-term vision (6–24 months):**

**6 Months:**
- 1,000+ registered `.trust` domains
- Full knowledge graph integration
- Agent identity support
- Mobile application

**12 Months:**
- 10,000+ registered domains
- Premium domain marketplace
- Multi-chain resolution support
- Enterprise domain management

**24 Months:**
- Industry-standard naming service for Intuition
- Integration with major dApps and wallets
- Cross-chain identity bridging
- Governance token for registry management

**Post-grant sustainability plan:**
- Domain registration fees provide ongoing revenue
- Renewal fees create recurring income stream
- Premium/auction domains for high-value names
- Enterprise services for organizations

### Optional

**Business or revenue model:**
- Registration fees: 30-100 TRUST/year (based on domain length)
- Renewal fees: Same as registration
- Premium auctions: Market-rate pricing for valuable names
- Enterprise: Bulk pricing and management tools

**Go-to-market or distribution strategy:**
- Integration with Intuition wallet/apps
- Partnerships with dApps building on Intuition
- Community incentives for early adopters
- Agent developer outreach for AI identity

**Competitive landscape:**
- ENS (Ethereum) - Established but not Intuition-native
- Unstoppable Domains - Multi-chain but no Intuition support
- TNS is the only naming service built specifically for Intuition

---

## 7. Additional Materials

### Required

**Demo link, repo, or screenshots:**
- Live Demo: https://tns.intuition.box
- GitHub: [Your Repository URL]
- Block Explorer (Contracts):
  - Registry: https://explorer.intuition.systems/address/0x7C365AF9034b00dadc616dE7f38221C678D423Fa
  - Resolver: https://explorer.intuition.systems/address/0x490a0B0EAD6B1da1C7810ACBc9574D7429880F06
  - Payment Forwarder: https://explorer.intuition.systems/address/0x640E4fD39A2f7f65BBB344988eFF7470A98E2547

**Contact email + wallet address:**
- Email: [Your Email]
- Wallet: [Your Wallet Address]

### Optional

**Key Features Screenshots:**

1. **Domain Search & Registration**
   - Clean search interface with `.trust` suffix
   - Real-time availability checking from blockchain
   - Tiered pricing display (3-char: 100 TRUST, 4-char: 70 TRUST, 5+: 30 TRUST)

2. **Commit-Reveal Registration Flow**
   - Step 1: Commit transaction (60-second wait)
   - Step 2: Reveal and register (24-hour window)
   - Front-running protection built-in

3. **Domain Management Dashboard**
   - View all owned domains
   - Set primary domain for reverse resolution
   - Configure resolver records
   - Renew registrations

4. **Payment Forwarding**
   - Send TRUST to `.trust` domains
   - Automatic address resolution
   - Transaction confirmation with explorer links

5. **NFT Metadata**
   - Dynamic SVG images with tier-based colors
   - Gold gradient for 3-char domains
   - Blue gradient for 4-char domains
   - Purple gradient for 5+ char domains
   - Full marketplace compatibility

---

## Smart Contract Addresses (Intuition Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| TNSRegistryERC721 | `0x7C365AF9034b00dadc616dE7f38221C678D423Fa` | Main registry, NFT minting |
| TNSResolver | `0x490a0B0EAD6B1da1C7810ACBc9574D7429880F06` | Resolution records storage |
| TNSPaymentForwarder | `0x640E4fD39A2f7f65BBB344988eFF7470A98E2547` | Payment routing to domains |

---

## Pricing Structure

| Domain Length | Price per Year | Example |
|---------------|----------------|---------|
| 3 characters | 100 TRUST | `bob.trust` |
| 4 characters | 70 TRUST | `alice.trust` → `alic.trust` |
| 5+ characters | 30 TRUST | `alice.trust` |

---

*TNS - Building the identity layer for Intuition*
