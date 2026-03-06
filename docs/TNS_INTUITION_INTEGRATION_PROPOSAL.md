# Trust Name Service (TNS) — Intuition Integration Proposal

**Prepared by:** Trust Name Service Team
**Date:** March 2026
**Version:** 1.0
**Status:** Proposal

---

## Executive Summary

The Trust Name Service (TNS) proposes a deep, native integration with Intuition's decentralized Knowledge Graph to establish `.trust` domains as the foundational identity layer for AI agents and human participants in the Intuition ecosystem.

TNS is a fully deployed, production-grade naming service built on Intuition's mainnet (Chain ID 1155). It provides human-readable `.trust` domain names backed by exact clones of the audited ENS (Ethereum Name Service) smart contracts. With 143 active domains and 111 unique holders already on-chain, TNS is ready to serve as Intuition's native identity infrastructure.

This proposal outlines how integrating TNS with Intuition's Knowledge Graph, attestation system, and Model Context Protocol (MCP) creates a unified identity and reputation layer — particularly for the emerging AI agent economy.

---

## 1. The Problem

### 1.1 Identity in Decentralized Systems Is Fragmented

Raw blockchain addresses (`0x3f7a...`) are the primary identifiers in Web3. They are:
- Impossible to remember or communicate
- Indistinguishable from one another
- Disconnected from reputation, capabilities, or intent
- Unusable as stable identifiers for AI agents

### 1.2 AI Agents Need Persistent, Verifiable Identity

As AI agents increasingly participate in on-chain activities — executing trades, analyzing data, reviewing smart contracts, communicating with other agents — they need:
- **Persistent identity** that survives across sessions and platforms
- **Verifiable ownership** tied to cryptographic keys
- **Discoverable capabilities** so other agents and users can find them
- **Reputation history** that builds over time based on performance
- **Interoperable naming** that works across protocols

### 1.3 Intuition's Knowledge Graph Lacks a Native Naming Layer

Intuition's Knowledge Graph provides atoms, triples, and signals — powerful primitives for structuring knowledge and expressing trust. However, without a naming layer, entities in the graph are referenced by opaque identifiers. A human-readable naming service would make the Knowledge Graph dramatically more accessible and usable.

---

## 2. What TNS Brings to Intuition

### 2.1 Production Infrastructure — Already Deployed

TNS is not a concept or prototype. It is fully operational on Intuition mainnet with:

| Metric | Value |
|--------|-------|
| Active domains | 143 |
| Unique holders | 111 |
| Smart contracts | 9 (all source-code verified) |
| Contract lineage | Exact clones of audited ENS contracts |
| Chain | Intuition mainnet (Chain ID 1155) |
| Domain extension | `.trust` |

### 2.2 Audited, Battle-Tested Smart Contracts

TNS contracts are exact clones of the ENS contracts that have secured billions of dollars on Ethereum. The only modifications are:
- `.eth` → `.trust` TLD restriction
- `DSValue` oracle instead of Chainlink (for on-chain pricing)
- Simplified `register()` function (without `registerWithConfig`)
- Comments updated to reference TNS

Full diff reviews are publicly available:
- [ethregistrar contracts diff](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
- [root contracts diff](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)

### 2.3 Complete Contract Suite

| Contract | Address | Purpose |
|----------|---------|---------|
| TNS Registry | `0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e` | Core registry mapping names → owners/resolvers |
| Base Registrar (ERC-721) | `0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629` | NFT ownership of domain names |
| ETHRegistrarController | `0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80` | Commit-reveal registration with front-running protection |
| Resolver | `0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b` | Address, text, and content hash records |
| Reverse Registrar | `0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080` | Address → domain reverse resolution |
| Price Oracle | `0x77C5F276dd8f7321E42580AC53E73859C080A0f2` | USD-based tiered pricing |
| Payment Forwarder | `0xF661722f065D8606CC6b5be84296D67D9fe7bD13` | Send TRUST tokens to domain names |
| Root | `0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24` | Root node ownership and TLD locking |
| Dummy Oracle | `0x903cc70Cda037249e8D1870Bcd6C528710B73b7E` | Price feed for oracle |

### 2.4 Tiered Pricing Model

| Domain Length | Annual Cost |
|---------------|------------|
| 3 characters | 100 TRUST |
| 4 characters | 70 TRUST |
| 5+ characters | 30 TRUST |

### 2.5 Security Features

- **Commit-reveal registration** — Prevents front-running of domain registrations
- **90-day grace period** — Expired domains can be renewed by the original owner for 90 days
- **ERC-721 NFT ownership** — Domains are tradeable, transferable NFTs
- **On-chain resolver records** — Addresses, text records, content hashes, and avatars stored on-chain

---

## 3. Proposed Integration Architecture

### 3.1 Domains as First-Class Atoms

Every registered `.trust` domain becomes an **Atom** in Intuition's Knowledge Graph.

**Atom URI format:** `{domainName}.trust`

This means `alice.trust` becomes a permanent, referenceable entity in the Knowledge Graph — queryable, stakeable, and connectable to any other Atom.

```
createAtom("alice.trust") → Atom #12345
```

### 3.2 Domain Relationships as Triples

Domain metadata is expressed as **Triples** (Subject → Predicate → Object):

| Triple | Meaning |
|--------|---------|
| `[alice.trust]` → `[ownedBy]` → `[0x123...]` | Domain ownership |
| `[alice.trust]` → `[resolvesTo]` → `[0x456...]` | Address resolution |
| `[alice.trust]` → `[expiresOn]` → `[2027-03-15]` | Expiration date |
| `[alice.trust]` → `[isPrimaryDomainOf]` → `[0x123...]` | Reverse resolution |
| `[alice.trust]` → `[hasCapability]` → `[code-review]` | Agent capability |
| `[alice.trust]` → `[hasAgentType]` → `[analyzer]` | Agent classification |

### 3.3 Reputation via Signals (Staking)

Users and agents can **stake TRUST tokens** on domain Atoms to express trust and build reputation:

```
depositAtom(atomId: "alice.trust", amount: 10 TRUST)
```

This creates a transparent, on-chain reputation score:
- **Total staked** — How much value is backing this identity
- **Number of stakers** — How many independent parties trust this identity
- **Reputation score** — Logarithmic scoring (`log10(staked + 1) × √(stakers + 1)`) to prevent whale dominance

**Reputation tiers:**
| Tier | Score | Benefit |
|------|-------|---------|
| Bronze | 0+ | Basic visibility in agent directory |
| Silver | 20+ | Featured in discovery results |
| Gold | 50+ | Priority ranking in agent search |
| Platinum | 100+ | Top-tier trust — premium agent badge |

### 3.4 Real-Time Sync

New domain registrations, transfers, and resolver updates are automatically synced to the Knowledge Graph:

1. **Registration** → Creates domain Atom + ownership/expiry Triples
2. **Transfer** → Updates ownership Triple
3. **Resolver update** → Updates resolution Triple
4. **Renewal** → Updates expiry Triple
5. **Agent registration** → Creates agent Atom + capability/type Triples

---

## 4. AI Agent Identity Infrastructure

This is the centerpiece of the proposal. TNS + Intuition together create the infrastructure for AI agents to operate as first-class participants in a decentralized economy.

### 4.1 Agent Registration

Any AI agent can claim a `.trust` domain and register its identity:

```json
{
  "domain": "claude-analyzer.trust",
  "agentType": "Analyzer",
  "capabilities": ["data-analysis", "smart-contract-analysis", "risk-assessment"],
  "endpoint": "https://claude-analyzer.api.example.com",
  "mcpEndpoint": "https://claude-analyzer.api.example.com/mcp",
  "publicKey": "0x04a1b2c3...",
  "version": "2.1.0"
}
```

This creates:
- A persistent, human-readable identity (`claude-analyzer.trust`)
- A Knowledge Graph Atom with all metadata
- Triples linking the agent to its capabilities, type, and owner
- An MCP-discoverable service endpoint

### 4.2 Agent Discovery

Other agents and users can discover agents by querying the Knowledge Graph:

- **"Find me an agent that can review smart contracts"** → Query for agents with `smart-contract-analysis` capability
- **"What's the most trusted data analysis agent?"** → Sort by reputation score
- **"Show me all agents owned by 0x123..."** → Query ownership Triples

### 4.3 Agent-to-Agent Communication

Agents authenticate to each other using their `.trust` domains:

1. Agent A wants to communicate with `bob-trader.trust`
2. Agent A resolves `bob-trader.trust` → gets endpoint + public key
3. Agent A sends a cryptographic challenge signed with its own domain key
4. Agent B verifies the signature against the domain owner's address
5. Authenticated channel established

### 4.4 Agent Schema (Schema.org Compatible)

Each agent generates a Schema.org-compatible manifest:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareAgent",
  "@id": "tns:claude-analyzer.trust",
  "name": "claude-analyzer.trust",
  "description": "AI agent for smart contract analysis and risk assessment",
  "capabilities": ["data-analysis", "smart-contract-analysis"],
  "url": "https://claude-analyzer.api.example.com",
  "potentialAction": [
    {
      "@type": "Action",
      "name": "data-analysis",
      "target": "https://claude-analyzer.api.example.com/analyze"
    }
  ]
}
```

### 4.5 Supported Agent Types

| Type | Description | Example Capabilities |
|------|-------------|---------------------|
| Assistant | General-purpose AI assistants | text-generation, web-search |
| Analyzer | Data and contract analysis | data-analysis, smart-contract-analysis, risk-assessment |
| Trader | Trading and financial agents | trading, market-analysis |
| Validator | Verification and validation | identity-verification, reputation-scoring |
| Orchestrator | Multi-agent coordination | agent-orchestration, task-routing |

---

## 5. MCP Server — AI-Native Interface

TNS provides a **Model Context Protocol (MCP) server** that allows AI assistants (Claude, GPT, etc.) to natively interact with the TNS and Intuition ecosystems.

### 5.1 Available MCP Tools

| Tool | Description |
|------|-------------|
| `resolve_domain` | Resolve a `.trust` domain to its address and Knowledge Graph data |
| `check_availability` | Check if a domain name is available for registration |
| `get_domain_reputation` | Get trust score, staking info, and reputation tier |
| `get_domain_graph` | Retrieve all Knowledge Graph atoms and triples for a domain |
| `discover_agents` | Find AI agents by capability, type, or reputation |
| `get_agent_info` | Get full metadata for a registered agent |
| `register_agent` | Register a new AI agent with a `.trust` identity |
| `search_atoms` | Generic search for any Atom URI pattern |
| `get_pricing` | Get current pricing for domain registration |
| `send_agent_message` | Send authenticated messages between agents |
| `get_agent_reputation` | Get reputation metrics for a specific agent |

### 5.2 Example AI Interaction

An AI assistant using the MCP tools:

```
User: "Find me the most trusted smart contract auditor on Intuition"

AI Assistant:
1. discover_agents(capability: "smart-contract-analysis")
2. get_agent_reputation("auditor-prime.trust")
3. resolve_domain("auditor-prime.trust")

Response: "auditor-prime.trust is a Gold-tier analyzer with a trust score 
of 67.3, backed by 42 stakers. It specializes in smart contract analysis 
and risk assessment. You can reach it at https://auditor-prime.api.com"
```

---

## 6. Technical Integration Points

### 6.1 Knowledge Graph SDK

TNS uses Intuition's `@0xintuition/graphql` SDK to:
- Query atoms and triples for domain metadata
- Retrieve reputation and staking data
- Search for agents by capability
- Build domain relationship graphs

### 6.2 EthMultiVault Integration

TNS interacts with Intuition's `EthMultiVault` proxy contract (`0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e`) to:
- Create Atoms for new domains and agents (~0.1 TRUST per atom)
- Create Triples linking domains to owners, capabilities, and metadata
- Enable staking/signaling on domain and agent Atoms

### 6.3 API Endpoints

TNS exposes REST APIs that bridge on-chain TNS data with the Knowledge Graph:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/atom/:domain` | GET | Domain Atom metadata (JSON-LD) |
| `/api/domains/:name/graph` | GET | Knowledge Graph relationships for a domain |
| `/api/domains/:name/reputation` | GET | Reputation score and staking data |
| `/api/knowledge-graph/atoms` | GET | Search atoms by URI |
| `/api/agents/register` | POST | Register an AI agent |
| `/api/agents/discover` | GET | Discover agents by capability/type |
| `/api/agents/:domain` | GET | Get agent metadata |
| `/api/agents/:domain/reputation` | GET | Agent reputation metrics |
| `/api/knowledge-graph/sync/user-domains` | POST | Sync user domains to Knowledge Graph |
| `/api/knowledge-graph/sync/scan` | POST | Scan for new domains to sync |
| `/api/knowledge-graph/sync/status` | GET | Check sync status |

### 6.4 Domain Record Sync Workflow

Updates to domain records follow a two-step process for Knowledge Graph synchronization:

1. **Step 1: Create Atoms** — Domain, owner address, and metadata are created as Atoms
2. **Step 2: Create Triples** — Relationships (ownership, resolution, capabilities) are linked as Triples

This ensures atomic consistency: either all relationships are created, or none are.

---

## 7. What TNS Needs from Intuition

### 7.1 Official Recognition

- **Native naming service status** — Recognition of `.trust` as Intuition's canonical naming service
- **Documentation** — Include TNS in Intuition developer documentation and guides
- **SDK integration** — Add TNS resolution to Intuition's SDKs and tools

### 7.2 Technical Support

- **Atom URI standardization** — Agree on URI formats for domain Atoms (e.g., `alice.trust`)
- **Predicate standardization** — Define official predicates for domain relationships (`ownedBy`, `resolvesTo`, etc.)
- **Event indexing** — Index TNS contract events in Intuition's subgraph/indexer for real-time sync
- **Vault integration** — Enable staking on domain Atoms through Intuition's standard staking UI

### 7.3 Ecosystem Integration

- **Explorer integration** — Display `.trust` domain names in the Intuition Explorer alongside raw addresses
- **Wallet integration** — Support `.trust` name resolution in Intuition-compatible wallets
- **DApp integration** — Encourage ecosystem DApps to integrate TNS for user-friendly addressing

---

## 8. What Intuition Gets from TNS

### 8.1 Human-Readable Identity Layer

- Every address in the Knowledge Graph becomes nameable
- Users can reference entities by name instead of `0x...` addresses
- The Knowledge Graph becomes dramatically more navigable

### 8.2 AI Agent Infrastructure

- Ready-made identity, discovery, and reputation system for AI agents
- MCP server enabling any AI assistant to interact with the Intuition ecosystem
- Agent-to-agent authentication and communication protocol
- Schema.org compatible agent manifests for interoperability

### 8.3 Revenue and Activity

- Domain registrations generate on-chain activity and TRUST token demand
- Registration fees (30–100 TRUST/year) create protocol revenue
- Atom creation for domains drives EthMultiVault usage
- Staking on domain reputation drives TRUST token utility

### 8.4 Network Effects

- 143 domains and 111 holders already active — an existing community
- Each new agent registration creates multiple Atoms and Triples
- Agent discovery drives Knowledge Graph queries
- Reputation staking deepens economic commitment to the ecosystem

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Deploy all 9 TNS contracts on Intuition mainnet
- [x] Source-code verify all contracts on Intuition Explorer
- [x] Migrate 143 domains from V1/V2 to V3
- [x] Build web application with search, registration, management
- [x] Implement commit-reveal registration with front-running protection
- [x] Implement reverse resolution and payment forwarding
- [x] Build NFT metadata system with dynamic SVG images
- [x] Implement domain image upload with IPFS pinning

### Phase 2: Knowledge Graph Integration (Proposed)
- [ ] Create Atoms for all 143 existing domains
- [ ] Establish standard predicates (ownedBy, resolvesTo, expiresOn, etc.)
- [ ] Build real-time sync for new registrations, transfers, and updates
- [ ] Enable reputation staking on domain Atoms
- [ ] Display reputation scores on domain pages

### Phase 3: Agent Identity (Proposed)
- [ ] Launch AI agent registration system
- [ ] Build agent discovery API and UI
- [ ] Implement agent-to-agent authentication protocol
- [ ] Deploy MCP server for AI assistant integration
- [ ] Create agent reputation tiers and leaderboard

### Phase 4: Ecosystem Growth (Future)
- [ ] Intuition Explorer integration (display domain names)
- [ ] Wallet integration for `.trust` name resolution
- [ ] Subdomain support for agent namespaces (e.g., `task.agent.trust`)
- [ ] Cross-chain name resolution
- [ ] Agent marketplace with reputation-based ranking

---

## 10. Conclusion

TNS and Intuition are natural complements:

- **Intuition** provides the Knowledge Graph, attestation system, and economic primitives
- **TNS** provides human-readable naming, identity infrastructure, and AI agent tooling

Together, they create a complete identity and reputation layer for the decentralized web — one where both humans and AI agents can operate with verifiable, stakeable, discoverable identities.

TNS is already live, already battle-tested (via ENS contracts), and already serving 111 unique domain holders. The integration proposed here would make `.trust` domains the native identity layer of the Intuition ecosystem, unlocking the full potential of AI agent infrastructure built on decentralized knowledge.

---

## Appendix A: Contract Verification

All 9 TNS contracts are source-code verified on the Intuition Explorer. Full diff reviews against the original ENS contracts are available at:

- **ethregistrar**: [github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
- **root**: [github.com/intuition-box/diff_root-contracts_ENS-TNS](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)
- **Controllable**: [github.com/ensdomains/root/.../Controllable.sol](https://github.com/ensdomains/root/blob/master/contracts/Controllable.sol)

## Appendix B: Original ENS Repositories

| Repository | Description |
|------------|-------------|
| [ensdomains/ens](https://github.com/ensdomains/ens) | Core ENS registry and interface |
| [ensdomains/ethregistrar](https://github.com/ensdomains/ethregistrar) | ETH registrar, controller, price oracles |
| [ensdomains/root](https://github.com/ensdomains/root) | Root contract, Ownable, Controllable |
| [ensdomains/ens-contracts](https://github.com/ensdomains/ens-contracts) | Reverse registrar, resolver, wrapper |

## Appendix C: Key Links

- **TNS Application**: [tns.intuition.box](https://tns.intuition.box)
- **Intuition Explorer**: [explorer.intuition.systems](https://explorer.intuition.systems)
- **Intuition Mainnet RPC**: `https://intuition.calderachain.xyz`
- **Chain ID**: 1155
