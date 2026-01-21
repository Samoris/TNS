# TNS Integration with Intuition Knowledge Graph

This guide explains how to integrate Trust Name Service (TNS) with Intuition's Knowledge Graph, Agent Registry, and MCP (Model Context Protocol).

---

## Overview

Intuition is a decentralized knowledge protocol that structures data using:
- **Atoms** - Unique identifiers for entities (people, domains, concepts)
- **Triples** - Subject-Predicate-Object relationships between Atoms
- **Signals** - Token staking to express trust/conviction in claims

TNS will integrate with Intuition to make `.trust` domains first-class citizens in the knowledge graph.

---

## 1. Create Atoms for Each Registered Domain

### What is an Atom?
An Atom is a unique, persistent identifier for any entity. Each `.trust` domain will become an Atom in the knowledge graph.

### Implementation

#### Install the SDK
```bash
npm install @0xintuition/graphql
```

#### Configure the Client
```typescript
// server/intuition.ts
import { configureClient, createServerClient, API_URL_PROD } from '@0xintuition/graphql';

// Configure for production
configureClient({ apiUrl: API_URL_PROD });

const intuitionClient = createServerClient({});

export { intuitionClient };
```

#### Create Domain Atom on Registration
```typescript
// server/intuition.ts
import { ethers } from 'ethers';

// Intuition EthMultiVault contract address (on Base L3)
const INTUITION_VAULT_ADDRESS = '0x...'; // Get from Intuition docs
const INTUITION_RPC = 'https://base.intuition.systems'; // Intuition L3 RPC

// ABI for creating atoms (simplified)
const INTUITION_ABI = [
  'function createAtom(bytes calldata atomUri) external payable returns (uint256)',
  'function createTriple(uint256 subjectId, uint256 predicateId, uint256 objectId) external payable returns (uint256)'
];

export async function createDomainAtom(domainName: string, ownerAddress: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(INTUITION_RPC);
  const wallet = new ethers.Wallet(process.env.INTUITION_PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(INTUITION_VAULT_ADDRESS, INTUITION_ABI, wallet);
  
  // Create URI for the domain atom
  // Format: custom URI pointing to TNS metadata
  const atomUri = `https://tns.intuition.box/api/atom/${domainName}.trust`;
  
  // Create the atom on-chain
  const tx = await contract.createAtom(
    ethers.toUtf8Bytes(atomUri),
    { value: ethers.parseEther('0.001') } // Small deposit to create atom
  );
  
  const receipt = await tx.wait();
  const atomId = receipt.logs[0].args.atomId; // Get atom ID from event
  
  console.log(`Created atom for ${domainName}.trust with ID: ${atomId}`);
  return atomId.toString();
}
```

#### Domain Atom Metadata Endpoint
```typescript
// server/routes.ts - Add atom metadata endpoint
app.get('/api/atom/:domain', async (req, res) => {
  const { domain } = req.params;
  const domainName = domain.replace('.trust', '');
  
  // Get domain info from blockchain
  const domainInfo = await blockchainService.getDomainInfo(domainName);
  
  if (!domainInfo) {
    return res.status(404).json({ error: 'Domain not found' });
  }
  
  // Return atom-compatible metadata
  res.json({
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    '@id': `tns:${domainName}.trust`,
    name: `${domainName}.trust`,
    description: `Trust Name Service domain: ${domainName}.trust`,
    identifier: domainInfo.tokenId,
    owner: domainInfo.owner,
    resolver: domainInfo.resolver,
    registrationDate: new Date(domainInfo.registrationDate * 1000).toISOString(),
    expirationDate: new Date(domainInfo.expirationDate * 1000).toISOString(),
    pricingTier: getPricingTier(domainName.length),
    url: `https://tns.intuition.box/domain/${domainName}`
  });
});
```

---

## 2. Establish Triples Linking Domains to Owners, Resolvers, Metadata

### What is a Triple?
A Triple is a Subject-Predicate-Object relationship. For domains, we create triples like:
- `[alice.trust] [ownedBy] [0x123...]`
- `[alice.trust] [resolvesTo] [0x456...]`
- `[alice.trust] [expiresOn] [2025-11-29]`

### Implementation

#### Create Predicate Atoms (One-time setup)
```typescript
// server/intuition.ts
export async function setupPredicateAtoms() {
  // Create standard predicates for TNS
  const predicates = [
    { name: 'ownedBy', uri: 'tns:predicate:ownedBy' },
    { name: 'resolvesTo', uri: 'tns:predicate:resolvesTo' },
    { name: 'expiresOn', uri: 'tns:predicate:expiresOn' },
    { name: 'registeredOn', uri: 'tns:predicate:registeredOn' },
    { name: 'hasPricingTier', uri: 'tns:predicate:hasPricingTier' },
    { name: 'isPrimaryDomainOf', uri: 'tns:predicate:isPrimaryDomainOf' }
  ];
  
  const predicateIds: Record<string, string> = {};
  
  for (const pred of predicates) {
    const atomId = await createAtom(pred.uri);
    predicateIds[pred.name] = atomId;
  }
  
  // Store predicate IDs for later use
  return predicateIds;
}
```

#### Create Domain Triples on Registration
```typescript
// server/intuition.ts
export async function createDomainTriples(
  domainAtomId: string,
  ownerAddress: string,
  resolverAddress: string,
  expirationDate: number
): Promise<void> {
  const provider = new ethers.JsonRpcProvider(INTUITION_RPC);
  const wallet = new ethers.Wallet(process.env.INTUITION_PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(INTUITION_VAULT_ADDRESS, INTUITION_ABI, wallet);
  
  // Get or create owner atom
  const ownerAtomId = await getOrCreateAddressAtom(ownerAddress);
  
  // Create triple: [domain] [ownedBy] [owner]
  await contract.createTriple(
    domainAtomId,
    PREDICATE_IDS.ownedBy,
    ownerAtomId,
    { value: ethers.parseEther('0.0005') }
  );
  
  // Create triple: [domain] [resolvesTo] [resolver]
  const resolverAtomId = await getOrCreateAddressAtom(resolverAddress);
  await contract.createTriple(
    domainAtomId,
    PREDICATE_IDS.resolvesTo,
    resolverAtomId,
    { value: ethers.parseEther('0.0005') }
  );
  
  // Create triple: [domain] [expiresOn] [date]
  const dateAtomId = await getOrCreateDateAtom(expirationDate);
  await contract.createTriple(
    domainAtomId,
    PREDICATE_IDS.expiresOn,
    dateAtomId,
    { value: ethers.parseEther('0.0005') }
  );
  
  console.log(`Created triples for domain atom ${domainAtomId}`);
}
```

---

## 3. Enable Attestations and Reputation Signals

### What are Signals?
Users can stake TRUST tokens to signal agreement or disagreement with claims about domains.

### Implementation

#### Query Domain Reputation
```typescript
// server/intuition.ts
import { useGetAtomQuery } from '@0xintuition/graphql';

export async function getDomainReputation(domainAtomId: string) {
  const query = `
    query GetDomainReputation($atomId: String!) {
      atom(id: $atomId) {
        id
        uri
        totalShares
        totalAssets
        vault {
          id
          curveId
          isActive
        }
        positions {
          id
          user
          shares
          assets
        }
      }
    }
  `;
  
  const result = await intuitionClient.query(query, { atomId: domainAtomId });
  
  return {
    totalStaked: result.atom.totalAssets,
    totalShares: result.atom.totalShares,
    stakeholders: result.atom.positions.length,
    reputationScore: calculateReputationScore(result.atom)
  };
}

function calculateReputationScore(atom: any): number {
  // Simple reputation score based on staked value and stakeholder count
  const stakedValue = parseFloat(atom.totalAssets);
  const stakeholderCount = atom.positions.length;
  
  // Logarithmic scoring to prevent whale dominance
  return Math.log10(stakedValue + 1) * Math.sqrt(stakeholderCount + 1);
}
```

#### Display Reputation on Domain Page
```typescript
// client/src/components/domain-reputation.tsx
import { useQuery } from '@tanstack/react-query';

export function DomainReputation({ domainName }: { domainName: string }) {
  const { data: reputation, isLoading } = useQuery({
    queryKey: ['/api/domains', domainName, 'reputation'],
  });
  
  if (isLoading) return <div>Loading reputation...</div>;
  
  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="font-semibold mb-2">Domain Reputation</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Trust Score</p>
          <p className="text-2xl font-bold">{reputation?.reputationScore.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Stakers</p>
          <p className="text-2xl font-bold">{reputation?.stakeholders}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Staked</p>
          <p className="text-lg">{reputation?.totalStaked} TRUST</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. API Endpoints for Querying Domain Atoms and Relationships

### GraphQL Queries

```typescript
// server/routes.ts

// Get domain with all relationships
app.get('/api/domains/:name/graph', async (req, res) => {
  const { name } = req.params;
  
  const query = `
    query GetDomainGraph($uri: String!) {
      atoms(where: { uri_contains: $uri }) {
        id
        uri
        totalAssets
        triplesAsSubject {
          id
          predicate { uri }
          object { uri }
        }
        triplesAsObject {
          id
          subject { uri }
          predicate { uri }
        }
      }
    }
  `;
  
  const result = await intuitionClient.query(query, { 
    uri: `tns:${name}.trust` 
  });
  
  res.json({
    domain: name,
    atomId: result.atoms[0]?.id,
    relationships: result.atoms[0]?.triplesAsSubject.map((t: any) => ({
      predicate: t.predicate.uri,
      object: t.object.uri
    })),
    references: result.atoms[0]?.triplesAsObject.map((t: any) => ({
      subject: t.subject.uri,
      predicate: t.predicate.uri
    }))
  });
});

// Search domains by owner
app.get('/api/owners/:address/domains', async (req, res) => {
  const { address } = req.params;
  
  const query = `
    query GetOwnerDomains($ownerUri: String!, $predicateUri: String!) {
      triples(where: { 
        predicate_: { uri: $predicateUri },
        object_: { uri_contains: $ownerUri }
      }) {
        subject {
          uri
          totalAssets
        }
      }
    }
  `;
  
  const result = await intuitionClient.query(query, {
    ownerUri: address.toLowerCase(),
    predicateUri: 'tns:predicate:ownedBy'
  });
  
  res.json({
    owner: address,
    domains: result.triples.map((t: any) => ({
      name: t.subject.uri.replace('tns:', ''),
      reputation: t.subject.totalAssets
    }))
  });
});
```

---

## 5. Sync Existing Registered Domains to Knowledge Graph

### Batch Sync Script

```typescript
// scripts/sync-to-knowledge-graph.ts
import { ethers } from 'ethers';
import { createDomainAtom, createDomainTriples } from '../server/intuition';

const TNS_REGISTRY_ADDRESS = '0x7C365AF9034b00dadc616dE7f38221C678D423Fa';
const INTUITION_RPC = 'https://intuition.calderachain.xyz';

async function syncAllDomains() {
  const provider = new ethers.JsonRpcProvider(INTUITION_RPC);
  const registry = new ethers.Contract(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, provider);
  
  // Get all registered domains from events
  const filter = registry.filters.DomainRegistered();
  const events = await registry.queryFilter(filter, 0, 'latest');
  
  console.log(`Found ${events.length} domains to sync`);
  
  for (const event of events) {
    const domainName = event.args.name;
    const owner = event.args.owner;
    const tokenId = event.args.tokenId;
    
    try {
      // Check if domain already exists in knowledge graph
      const existingAtom = await findDomainAtom(domainName);
      
      if (!existingAtom) {
        console.log(`Syncing ${domainName}.trust...`);
        
        // Get current domain info
        const expirationDate = await registry.expirations(tokenId);
        const resolver = await registry.resolvers(tokenId);
        
        // Create atom and triples
        const atomId = await createDomainAtom(domainName, owner);
        await createDomainTriples(atomId, owner, resolver, expirationDate);
        
        console.log(`✓ Synced ${domainName}.trust (Atom ID: ${atomId})`);
      } else {
        console.log(`⏭ ${domainName}.trust already synced`);
      }
    } catch (error) {
      console.error(`✗ Failed to sync ${domainName}.trust:`, error);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Sync complete!');
}

syncAllDomains();
```

---

## 6. Real-Time Event Listeners for New Registrations

### WebSocket Event Listener

```typescript
// server/event-listener.ts
import { ethers } from 'ethers';
import { createDomainAtom, createDomainTriples } from './intuition';

const TNS_REGISTRY_ADDRESS = '0x7C365AF9034b00dadc616dE7f38221C678D423Fa';
const INTUITION_RPC = 'wss://intuition.calderachain.xyz/ws';

export function startEventListener() {
  const provider = new ethers.WebSocketProvider(INTUITION_RPC);
  const registry = new ethers.Contract(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, provider);
  
  // Listen for new domain registrations
  registry.on('DomainRegistered', async (name, owner, tokenId, expirationDate, event) => {
    console.log(`New domain registered: ${name}.trust`);
    
    try {
      // Create atom in knowledge graph
      const atomId = await createDomainAtom(name, owner);
      
      // Get resolver from contract
      const resolver = await registry.resolvers(tokenId);
      
      // Create relationship triples
      await createDomainTriples(atomId, owner, resolver, expirationDate);
      
      console.log(`✓ Added ${name}.trust to knowledge graph (Atom ID: ${atomId})`);
    } catch (error) {
      console.error(`Failed to add ${name}.trust to knowledge graph:`, error);
    }
  });
  
  // Listen for domain transfers
  registry.on('Transfer', async (from, to, tokenId, event) => {
    if (from === ethers.ZeroAddress) return; // Skip mints
    
    console.log(`Domain transferred: Token ${tokenId} from ${from} to ${to}`);
    
    try {
      // Update ownership triple in knowledge graph
      await updateDomainOwnership(tokenId, to);
    } catch (error) {
      console.error(`Failed to update ownership for token ${tokenId}:`, error);
    }
  });
  
  // Listen for resolver updates
  registry.on('ResolverUpdated', async (tokenId, newResolver, event) => {
    console.log(`Resolver updated for token ${tokenId}`);
    
    try {
      await updateDomainResolver(tokenId, newResolver);
    } catch (error) {
      console.error(`Failed to update resolver for token ${tokenId}:`, error);
    }
  });
  
  console.log('Event listener started');
}
```

---

## 7. Enable AI Agents to Register and Resolve .trust Identities

### Agent Registration Endpoint

```typescript
// server/routes.ts

// Register an AI agent with a .trust identity
app.post('/api/agents/register', async (req, res) => {
  const { 
    domainName, 
    agentType, 
    capabilities, 
    endpoint,
    publicKey 
  } = req.body;
  
  // Validate agent registration
  if (!domainName || !agentType || !capabilities) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Create agent-specific resolver records
    const agentMetadata = {
      type: 'ai-agent',
      agentType, // e.g., 'assistant', 'analyzer', 'trader'
      capabilities, // e.g., ['text-generation', 'code-review', 'data-analysis']
      endpoint, // e.g., 'https://agent.example.com/api'
      publicKey, // For agent-to-agent authentication
      version: '1.0',
      registeredAt: Date.now()
    };
    
    // Store in resolver
    await blockchainService.setTextRecord(
      domainName, 
      'agent.metadata', 
      JSON.stringify(agentMetadata)
    );
    
    // Create atom in knowledge graph with agent type
    const atomId = await createAgentAtom(domainName, agentMetadata);
    
    res.json({
      success: true,
      domain: `${domainName}.trust`,
      atomId,
      message: 'Agent registered successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

// Resolve agent identity
app.get('/api/agents/:domain', async (req, res) => {
  const { domain } = req.params;
  const domainName = domain.replace('.trust', '');
  
  try {
    const metadataJson = await blockchainService.getTextRecord(domainName, 'agent.metadata');
    
    if (!metadataJson) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const metadata = JSON.parse(metadataJson);
    const resolvedAddress = await blockchainService.resolve(domainName);
    
    res.json({
      domain: `${domainName}.trust`,
      address: resolvedAddress,
      ...metadata
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve agent' });
  }
});
```

---

## 8. Implement Agent-to-Agent Discovery via Domain Names

### Agent Discovery API

```typescript
// server/routes.ts

// Discover agents by capability
app.get('/api/agents/discover', async (req, res) => {
  const { capability, type } = req.query;
  
  // Query knowledge graph for agents with specific capabilities
  const query = `
    query DiscoverAgents($capabilityUri: String!) {
      triples(where: {
        predicate_: { uri: "tns:predicate:hasCapability" },
        object_: { uri_contains: $capabilityUri }
      }) {
        subject {
          uri
          totalAssets
        }
      }
    }
  `;
  
  const result = await intuitionClient.query(query, {
    capabilityUri: capability
  });
  
  // Get full agent details
  const agents = await Promise.all(
    result.triples.map(async (t: any) => {
      const domainName = t.subject.uri.replace('tns:', '').replace('.trust', '');
      const metadata = await getAgentMetadata(domainName);
      return {
        domain: `${domainName}.trust`,
        reputation: t.subject.totalAssets,
        ...metadata
      };
    })
  );
  
  // Sort by reputation
  agents.sort((a, b) => parseFloat(b.reputation) - parseFloat(a.reputation));
  
  res.json({ agents });
});

// Agent directory listing
app.get('/api/agents/directory', async (req, res) => {
  const { page = 1, limit = 20, sortBy = 'reputation' } = req.query;
  
  const query = `
    query GetAgentDirectory {
      atoms(
        where: { uri_contains: "agent" },
        orderBy: totalAssets,
        orderDirection: desc,
        first: ${limit},
        skip: ${(page - 1) * limit}
      ) {
        id
        uri
        totalAssets
        totalShares
      }
    }
  `;
  
  const result = await intuitionClient.query(query);
  
  res.json({
    agents: result.atoms,
    page,
    limit,
    total: result.atoms.length
  });
});
```

---

## 9. Add MCP (Model Context Protocol) Context for Agent Interactions

### MCP Server for TNS

```typescript
// server/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'tns-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {}
  }
});

// Resource: Domain information
server.setRequestHandler('resources/list', async () => {
  return {
    resources: [
      {
        uri: 'tns://domains',
        name: 'TNS Domains',
        description: 'Query .trust domain information'
      },
      {
        uri: 'tns://agents',
        name: 'TNS Agents',
        description: 'Discover AI agents registered with .trust identities'
      }
    ]
  };
});

// Tool: Resolve domain
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'resolve_domain',
        description: 'Resolve a .trust domain to its address',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name (e.g., alice.trust)' }
          },
          required: ['domain']
        }
      },
      {
        name: 'register_agent',
        description: 'Register an AI agent with a .trust identity',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
            agentType: { type: 'string' },
            capabilities: { type: 'array', items: { type: 'string' } },
            endpoint: { type: 'string' }
          },
          required: ['domain', 'agentType', 'capabilities']
        }
      },
      {
        name: 'discover_agents',
        description: 'Find AI agents by capability or type',
        inputSchema: {
          type: 'object',
          properties: {
            capability: { type: 'string' },
            type: { type: 'string' }
          }
        }
      },
      {
        name: 'send_payment',
        description: 'Send TRUST tokens to a .trust domain',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient domain (e.g., alice.trust)' },
            amount: { type: 'string', description: 'Amount in TRUST' }
          },
          required: ['to', 'amount']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'resolve_domain':
      const address = await blockchainService.resolve(args.domain.replace('.trust', ''));
      return { content: [{ type: 'text', text: `${args.domain} resolves to ${address}` }] };
      
    case 'discover_agents':
      const agents = await discoverAgents(args.capability, args.type);
      return { content: [{ type: 'text', text: JSON.stringify(agents, null, 2) }] };
      
    case 'register_agent':
      const result = await registerAgent(args);
      return { content: [{ type: 'text', text: `Agent registered: ${result.domain}` }] };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### MCP Configuration File
```json
// mcp.json
{
  "mcpServers": {
    "tns": {
      "command": "node",
      "args": ["./server/mcp-server.js"],
      "env": {
        "TNS_API_URL": "https://tns.intuition.box/api"
      }
    }
  }
}
```

---

## 10. Agent Verification and Attestation System

### Verification Levels

```typescript
// server/agent-verification.ts

export enum VerificationLevel {
  UNVERIFIED = 0,
  BASIC = 1,      // Domain ownership verified
  ENHANCED = 2,   // Endpoint reachable, capabilities tested
  TRUSTED = 3     // Community-attested, high reputation
}

export async function verifyAgent(domainName: string): Promise<VerificationLevel> {
  const agentMetadata = await getAgentMetadata(domainName);
  
  if (!agentMetadata) return VerificationLevel.UNVERIFIED;
  
  let level = VerificationLevel.BASIC;
  
  // Check if endpoint is reachable
  if (agentMetadata.endpoint) {
    try {
      const response = await fetch(`${agentMetadata.endpoint}/health`);
      if (response.ok) level = VerificationLevel.ENHANCED;
    } catch (e) {
      // Endpoint not reachable
    }
  }
  
  // Check community attestations
  const reputation = await getDomainReputation(domainName);
  if (reputation.stakeholders >= 10 && reputation.reputationScore >= 5) {
    level = VerificationLevel.TRUSTED;
  }
  
  return level;
}

// Create attestation triple
export async function attestAgent(
  attestorDomain: string,
  targetDomain: string,
  attestationType: 'reliable' | 'capable' | 'secure'
): Promise<string> {
  const attestorAtomId = await findDomainAtom(attestorDomain);
  const targetAtomId = await findDomainAtom(targetDomain);
  const predicateAtomId = await getOrCreatePredicateAtom(`attests:${attestationType}`);
  
  // Create attestation triple
  const tripleId = await createTriple(attestorAtomId, predicateAtomId, targetAtomId);
  
  return tripleId;
}
```

---

## 11. API for Agent Identity Lookup and Capability Discovery

### OpenAPI Specification

```yaml
# openapi.yaml (partial)
paths:
  /api/agents/{domain}:
    get:
      summary: Get agent identity and capabilities
      parameters:
        - name: domain
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentIdentity'
                
  /api/agents/discover:
    get:
      summary: Discover agents by capability
      parameters:
        - name: capability
          in: query
          schema:
            type: string
        - name: type
          in: query
          schema:
            type: string
        - name: minReputation
          in: query
          schema:
            type: number
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/AgentIdentity'

components:
  schemas:
    AgentIdentity:
      type: object
      properties:
        domain:
          type: string
          example: "assistant.trust"
        address:
          type: string
          example: "0x123..."
        agentType:
          type: string
          enum: [assistant, analyzer, trader, validator]
        capabilities:
          type: array
          items:
            type: string
        endpoint:
          type: string
        publicKey:
          type: string
        verificationLevel:
          type: integer
          enum: [0, 1, 2, 3]
        reputation:
          type: number
```

---

## 12. Agent-Specific Resolver Records

### Extended Resolver Schema

```typescript
// shared/agent-schema.ts
export interface AgentResolverRecords {
  // Standard TNS records
  'addr': string;           // ETH address
  'contenthash': string;    // IPFS hash
  
  // Agent-specific records
  'agent.type': string;              // 'assistant' | 'analyzer' | 'trader' | 'validator'
  'agent.capabilities': string;       // JSON array of capabilities
  'agent.endpoint': string;           // API endpoint URL
  'agent.publicKey': string;          // For authentication
  'agent.protocol': string;           // 'http' | 'websocket' | 'grpc'
  'agent.version': string;            // Semantic version
  'agent.description': string;        // Human-readable description
  'agent.pricing': string;            // JSON pricing info
  'agent.rateLimit': string;          // Requests per minute
  'agent.supportedModels': string;    // JSON array of supported LLM models
}

// Capability types
export type AgentCapability = 
  | 'text-generation'
  | 'code-review'
  | 'code-generation'
  | 'data-analysis'
  | 'image-generation'
  | 'translation'
  | 'summarization'
  | 'trading'
  | 'research'
  | 'customer-support';
```

### Set Agent Records

```typescript
// server/routes.ts
app.post('/api/agents/:domain/records', async (req, res) => {
  const { domain } = req.params;
  const { records } = req.body;
  
  // Verify caller owns the domain
  const owner = await blockchainService.getOwner(domain);
  if (owner.toLowerCase() !== req.body.caller.toLowerCase()) {
    return res.status(403).json({ error: 'Not domain owner' });
  }
  
  // Set each record
  for (const [key, value] of Object.entries(records)) {
    if (key.startsWith('agent.')) {
      await blockchainService.setTextRecord(domain, key, value as string);
    }
  }
  
  // Update knowledge graph
  await updateAgentAtomTriples(domain, records);
  
  res.json({ success: true });
});
```

---

## Summary: Implementation Phases

### Phase 1: Basic Integration (Weeks 1-4)
1. Install `@0xintuition/graphql` SDK
2. Create atom endpoint for domains
3. Set up predicate atoms for TNS relationships
4. Implement domain atom creation on registration
5. Build sync script for existing domains

### Phase 2: Real-Time Sync (Weeks 5-8)
1. Implement WebSocket event listeners
2. Create domain relationship triples
3. Add reputation querying endpoints
4. Display reputation on domain pages

### Phase 3: Agent Infrastructure (Weeks 9-12)
1. Build agent registration system
2. Implement agent discovery API
3. Create MCP server for AI integration
4. Add verification and attestation system

---

## Resources

- **Intuition Docs**: https://www.docs.intuition.systems/
- **Intuition GitHub**: https://github.com/0xIntuition
- **GraphQL SDK**: https://www.npmjs.com/package/@0xintuition/graphql
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Intuition MCP Server**: https://github.com/0xIntuition/intuition-mcp-server
