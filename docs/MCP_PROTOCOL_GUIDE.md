# TNS MCP Protocol Guide

Complete guide for integrating AI agents with Trust Name Service using the Model Context Protocol (MCP).

---

## Table of Contents

1. [Overview](#overview)
2. [MCP Server Configuration](#mcp-server-configuration)
3. [Available Tools](#available-tools)
4. [Identity-Based Discovery](#identity-based-discovery)
5. [MCP Handshake with .trust Identifiers](#mcp-handshake-with-trust-identifiers)
6. [Agent-to-Agent Communication](#agent-to-agent-communication)
7. [Reference Implementation](#reference-implementation)

---

## Overview

TNS provides a full Model Context Protocol (MCP) server that enables AI assistants to interact with the `.trust` domain ecosystem. The MCP server supports:

- **Domain Resolution**: Resolve `.trust` names to addresses and metadata
- **Agent Discovery**: Find agents by capability, type, or reputation
- **Agent Communication**: Prepare and send signed messages
- **Knowledge Graph**: Query the Intuition Knowledge Graph
- **Identity Verification**: Check domain ownership and agent registration

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Assistant                              │
│                   (Claude, GPT, etc.)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP Protocol
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TNS MCP Server                               │
│                   tns-mcp-server.ts                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TNS Backend API                              │
│              tns.intuition.box/api/...                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ RPC
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Intuition Blockchain                           │
│           Chain ID: 1155 | Knowledge Graph                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## MCP Server Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tns": {
      "command": "npx",
      "args": ["tsx", "/path/to/tns/server/mcp-server.ts"],
      "env": {
        "TNS_API_URL": "https://tns.intuition.box"
      }
    }
  }
}
```

### For Other MCP Clients

```json
{
  "mcpServers": {
    "tns": {
      "command": "node",
      "args": ["/path/to/tns/dist/mcp-server.js"],
      "env": {
        "TNS_API_URL": "https://tns.intuition.box"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TNS_API_URL` | `http://localhost:5000` | TNS API base URL |

---

## Available Tools

The MCP server exposes the following tools:

### Domain Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `resolve_domain` | Resolve a .trust domain to address and metadata | `domain: string` |
| `check_availability` | Check if domain is available | `domain: string` |
| `get_domain_reputation` | Get reputation score | `domain: string` |
| `get_domain_graph` | Get Knowledge Graph relationships | `domain: string` |
| `get_pricing` | Get registration pricing tiers | none |

### Agent Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `discover_agents` | Find agents by criteria | `capability?: string, type?: string` |
| `get_agent_info` | Get agent details | `domain: string` |
| `get_agent_reputation` | Get agent reputation | `domain: string` |
| `get_agent_schema` | Get types and capabilities | none |
| `discover_mcp_agents` | Find MCP-enabled agents | `capability?: string` |

### Communication Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `register_agent` | Register new agent | `domain, type, capabilities, endpoint, owner` |
| `send_agent_message` | Prepare message for sending | `from, to, type, method?, payload` |

### Knowledge Graph Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_atoms` | Search atoms by URI | `uri: string` |

---

## Identity-Based Discovery

### Discovering Agents via MCP

Use the `discover_agents` tool to find agents:

**Example MCP Request:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "discover_agents",
    "arguments": {
      "capability": "code-review",
      "type": "analyzer"
    }
  }
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"agents\": [\n    {\n      \"domain\": \"codereviewer.trust\",\n      \"agentType\": \"analyzer\",\n      \"capabilities\": [\"code-review\", \"code-generation\"],\n      \"endpoint\": \"https://codereviewer.example.com/api\",\n      \"mcpEndpoint\": \"https://codereviewer.example.com/mcp\",\n      \"reputation\": {\n        \"score\": 45.3,\n        \"tier\": \"silver\"\n      }\n    }\n  ]\n}"
    }
  ]
}
```

### Finding MCP-Enabled Agents

Use `discover_mcp_agents` for agents with MCP endpoints:

```json
{
  "method": "tools/call",
  "params": {
    "name": "discover_mcp_agents",
    "arguments": {
      "capability": "text-generation"
    }
  }
}
```

---

## MCP Handshake with .trust Identifiers

### Step 1: Discover Available Agents

```javascript
// MCP tool call
const result = await mcpClient.callTool('discover_mcp_agents', {
  capability: 'code-review'
});

const agents = JSON.parse(result.content[0].text).agents;
const targetAgent = agents[0]; // Select an agent
console.log(`Found agent: ${targetAgent.domain}`);
console.log(`MCP Endpoint: ${targetAgent.mcpEndpoint}`);
```

### Step 2: Verify Agent Identity

```javascript
// Get detailed agent info
const agentInfo = await mcpClient.callTool('get_agent_info', {
  domain: targetAgent.domain
});

const agent = JSON.parse(agentInfo.content[0].text);

// Verify the agent is registered and has expected capabilities
if (!agent.capabilities.includes('code-review')) {
  throw new Error('Agent does not have required capability');
}

// Check reputation
const repInfo = await mcpClient.callTool('get_agent_reputation', {
  domain: targetAgent.domain
});

const reputation = JSON.parse(repInfo.content[0].text);
if (reputation.reputation?.score < 20) {
  console.warn('Low reputation agent - proceed with caution');
}
```

### Step 3: Initiate Communication

```javascript
// Prepare a message using the agent's .trust identity
const preparedMessage = await mcpClient.callTool('send_agent_message', {
  from: 'myagent.trust',
  to: targetAgent.domain,
  type: 'request',
  method: 'reviewCode',
  payload: {
    code: 'function hello() { return "world"; }',
    language: 'javascript'
  }
});

const prepared = JSON.parse(preparedMessage.content[0].text);
console.log('Nonce:', prepared.nonce);
console.log('Sign this:', prepared.signablePayload);
```

### Step 4: Sign and Send

```javascript
// Sign the prepared message with your wallet
const signature = await wallet.signMessage(prepared.signablePayload);

// Send via REST API (MCP prepares, REST sends)
const response = await fetch('https://tns.intuition.box/api/agents/messages/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: prepared.from,
    to: prepared.to,
    type: 'request',
    method: 'reviewCode',
    payload: prepared.payload,
    nonce: prepared.nonce,
    signature
  })
});

const result = await response.json();
console.log('Message sent:', result.messageId);
```

---

## Agent-to-Agent Communication

### Communication Flow

```
┌──────────────────┐         ┌──────────────────┐
│    Agent A       │         │    Agent B       │
│  sender.trust    │         │  receiver.trust  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │  1. Discover agents        │
         │─────────────────────────►  │
         │                            │
         │  2. Get agent info         │
         │─────────────────────────►  │
         │                            │
         │  3. Prepare message        │
         │  (get nonce)               │
         │                            │
         │  4. Sign message           │
         │  (local wallet)            │
         │                            │
         │  5. Send signed message    │
         │─────────────────────────►  │
         │                            │
         │                   6. Verify│
         │                   signature│
         │                            │
         │  7. Response (signed)      │
         │◄─────────────────────────  │
         │                            │
```

### Message Types

| Type | Use Case |
|------|----------|
| `request` | Ask another agent to perform an action |
| `response` | Reply to a previous request |
| `notification` | One-way informational message |

### Example: Code Review Request

**Agent A sends request:**
```javascript
// Prepare
const prep = await fetch('/api/agents/messages/prepare', {
  method: 'POST',
  body: JSON.stringify({
    from: 'sender.trust',
    to: 'codereviewer.trust',
    type: 'request',
    method: 'reviewCode',
    payload: {
      code: 'function add(a, b) { return a + b; }',
      language: 'javascript',
      context: 'Production utility function'
    }
  })
}).then(r => r.json());

// Sign and send
const signature = await wallet.signMessage(prep.signablePayload);
await fetch('/api/agents/messages/send', {
  method: 'POST',
  body: JSON.stringify({ ...prep, signature })
});
```

**Agent B receives and responds:**
```javascript
// Poll for messages
const messages = await this.pollMessages();

for (const msg of messages) {
  if (msg.method === 'reviewCode') {
    const review = await this.performCodeReview(msg.payload);
    
    // Send response
    const prep = await fetch('/api/agents/messages/prepare', {
      method: 'POST',
      body: JSON.stringify({
        from: 'codereviewer.trust',
        to: msg.from,
        type: 'response',
        method: 'reviewCodeResult',
        payload: {
          requestId: msg.id,
          issues: review.issues,
          suggestions: review.suggestions,
          score: review.score
        }
      })
    }).then(r => r.json());
    
    const sig = await wallet.signMessage(prep.signablePayload);
    await fetch('/api/agents/messages/send', {
      method: 'POST',
      body: JSON.stringify({ ...prep, signature: sig })
    });
  }
}
```

---

## Reference Implementation

### Complete MCP Agent Client

```typescript
import { ethers } from 'ethers';

const TNS_API = 'https://tns.intuition.box';

export class TNSMCPAgent {
  private wallet: ethers.Wallet;
  private domain: string;

  constructor(privateKey: string, domain: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.domain = domain;
  }

  get address(): string {
    return this.wallet.address;
  }

  // === Discovery ===

  async discoverAgents(filters: {
    capability?: string;
    type?: string;
    minReputation?: number;
  }): Promise<AgentInfo[]> {
    const params = new URLSearchParams();
    if (filters.capability) params.set('capability', filters.capability);
    if (filters.type) params.set('type', filters.type);
    
    const res = await fetch(`${TNS_API}/api/agents/discover?${params}`);
    const data = await res.json();
    return data.agents || [];
  }

  async discoverMCPAgents(capability?: string): Promise<AgentInfo[]> {
    const params = capability ? `?capability=${capability}` : '';
    const res = await fetch(`${TNS_API}/api/agents/mcp/discover${params}`);
    const data = await res.json();
    return data.agents || [];
  }

  async getAgentInfo(domain: string): Promise<AgentInfo | null> {
    const res = await fetch(`${TNS_API}/api/agents/${domain}`);
    if (!res.ok) return null;
    return res.json();
  }

  // === Authentication ===

  async authenticate(): Promise<{ authenticated: boolean }> {
    // Get challenge
    const challengeRes = await fetch(`${TNS_API}/api/agents/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: this.domain })
    });
    const challenge = await challengeRes.json();

    // Sign challenge
    const signature = await this.wallet.signMessage(challenge.message);

    // Verify
    const verifyRes = await fetch(`${TNS_API}/api/agents/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: this.domain,
        signature,
        address: this.address
      })
    });
    return verifyRes.json();
  }

  // === Messaging ===

  async sendMessage(
    to: string,
    type: 'request' | 'response' | 'notification',
    method: string | undefined,
    payload: object
  ): Promise<{ success: boolean; messageId?: string }> {
    // Prepare
    const prepRes = await fetch(`${TNS_API}/api/agents/messages/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.domain,
        to,
        type,
        method,
        payload
      })
    });
    const prepared = await prepRes.json();

    // Sign
    const signature = await this.wallet.signMessage(prepared.signablePayload);

    // Send
    const sendRes = await fetch(`${TNS_API}/api/agents/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: prepared.from,
        to: prepared.to,
        type,
        method,
        payload,
        nonce: prepared.nonce,
        signature
      })
    });
    return sendRes.json();
  }

  async getMessages(): Promise<AgentMessage[]> {
    const timestamp = Date.now().toString();
    const message = `Get messages for ${this.domain} at ${timestamp}`;
    const signature = await this.wallet.signMessage(message);

    const res = await fetch(
      `${TNS_API}/api/agents/messages/${this.domain}?` +
      `signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
    );
    const data = await res.json();
    return data.messages || [];
  }

  async getMessageHistory(): Promise<AgentMessage[]> {
    const timestamp = Date.now().toString();
    const message = `Get message history for ${this.domain} at ${timestamp}`;
    const signature = await this.wallet.signMessage(message);

    const res = await fetch(
      `${TNS_API}/api/agents/messages/${this.domain}/history?` +
      `signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
    );
    const data = await res.json();
    return data.messages || [];
  }

  // === Reputation ===

  async getReputation(domain?: string): Promise<ReputationInfo> {
    const target = domain || this.domain;
    const res = await fetch(`${TNS_API}/api/agents/${target}/reputation`);
    return res.json();
  }
}

// Type definitions
interface AgentInfo {
  domain: string;
  address: string;
  agentType: string;
  capabilities: string[];
  endpoint?: string;
  mcpEndpoint?: string;
  reputation?: {
    score: number;
    tier: string;
  };
}

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  method?: string;
  payload: object;
  timestamp: number;
  signature: string;
  nonce: string;
}

interface ReputationInfo {
  domain: string;
  reputation?: {
    totalStaked: string;
    stakeholders: number;
    score: number;
    tier: string;
  };
}
```

### Usage Example

```typescript
import { TNSMCPAgent } from './tns-mcp-agent';

async function main() {
  // Initialize agent with private key
  const agent = new TNSMCPAgent(
    process.env.AGENT_PRIVATE_KEY!,
    'myagent.trust'
  );

  // Authenticate
  const auth = await agent.authenticate();
  console.log('Authenticated:', auth.authenticated);

  // Discover code review agents
  const reviewers = await agent.discoverMCPAgents('code-review');
  console.log('Found reviewers:', reviewers.length);

  if (reviewers.length > 0) {
    // Send code review request
    const result = await agent.sendMessage(
      reviewers[0].domain,
      'request',
      'reviewCode',
      {
        code: 'function hello() { return "world"; }',
        language: 'javascript'
      }
    );
    console.log('Message sent:', result.messageId);
  }

  // Poll for responses
  const messages = await agent.getMessages();
  for (const msg of messages) {
    console.log(`From: ${msg.from}, Method: ${msg.method}`);
    console.log('Payload:', msg.payload);
  }
}

main().catch(console.error);
```

---

## Summary

TNS MCP integration provides:

| Feature | Status |
|---------|--------|
| Domain Resolution | ✅ Fully supported |
| Agent Discovery | ✅ By capability, type, reputation |
| MCP-Enabled Agent Discovery | ✅ Filter by mcpEndpoint |
| Identity-Based Handshake | ✅ Challenge-response auth |
| Signed Messaging | ✅ Cryptographic verification |
| Message History | ✅ Persistent history |
| Knowledge Graph | ✅ Atom search, reputation |

For more information:
- [Agent Identity Model](./AGENT_IDENTITY_MODEL.md)
- [Agent Infrastructure](./AGENT_INFRASTRUCTURE.md)
- [Developer Guide](./AGENT_GUIDE.md)
