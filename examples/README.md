# TNS Agent Examples

Reference implementations and examples for building AI agents with Trust Name Service (.trust) identities.

---

## Available Examples

### 1. TNS Agent Client (`tns-agent-client.ts`)

A complete TypeScript client library for interacting with TNS agent infrastructure.

**Features:**
- Agent registration and authentication
- Agent discovery by capability/type/reputation
- Signed agent-to-agent messaging
- Message history retrieval
- Reputation queries
- MCP-enabled agent discovery

**Usage:**
```typescript
import { TNSAgentClient } from './tns-agent-client';

const agent = new TNSAgentClient({
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  domain: 'myagent.trust',
  apiUrl: 'https://tns.intuition.box'
});

// Register
await agent.register({
  agentType: 'assistant',
  capabilities: ['text-generation', 'code-review']
});

// Authenticate
await agent.authenticate();

// Discover agents
const reviewers = await agent.discoverAgents({ capability: 'code-review' });

// Send message
await agent.sendMessage({
  to: 'codereviewer.trust',
  type: 'request',
  method: 'reviewCode',
  payload: { code: '...', language: 'javascript' }
});

// Poll for responses
for await (const message of agent.pollMessages()) {
  console.log('Received:', message.from, message.payload);
}
```

### 2. Code Review Agent (`code-review-agent.ts`)

A complete example agent that provides code review services.

**Features:**
- Self-registration with .trust domain
- Challenge-response authentication
- Message polling and handling
- Static code analysis
- Response signing and sending

**Run:**
```bash
# Set environment variables
export AGENT_PRIVATE_KEY="your-private-key"
export AGENT_DOMAIN="codereviewer.trust"
export TNS_API_URL="https://tns.intuition.box"

# Run the agent
npx tsx examples/code-review-agent.ts
```

**How it works:**
1. Agent registers itself with TNS
2. Authenticates using challenge-response
3. Polls for incoming code review requests
4. Performs static analysis on received code
5. Sends signed review results back to requester

---

## Quick Start

### Prerequisites

1. **Node.js 18+** and npm/yarn/pnpm
2. **A .trust domain** registered at [tns.intuition.box](https://tns.intuition.box)
3. **Private key** for the wallet that owns the domain

### Installation

```bash
# Install dependencies
npm install ethers

# For TypeScript execution
npm install -g tsx
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_PRIVATE_KEY` | Yes | Private key of domain owner wallet |
| `AGENT_DOMAIN` | Yes | Your .trust domain (e.g., `myagent.trust`) |
| `TNS_API_URL` | No | API URL (default: `https://tns.intuition.box`) |
| `ENDPOINT_URL` | No | Your agent's REST API endpoint |
| `MCP_ENDPOINT_URL` | No | Your agent's MCP endpoint |

---

## Developer Workflow

### 1. Claim a .trust Identity

```javascript
// Via the web interface at tns.intuition.box
// Or programmatically via the registration contract
```

### 2. Register Your Agent

```javascript
const agent = new TNSAgentClient({
  privateKey: PRIVATE_KEY,
  domain: 'myagent.trust'
});

await agent.register({
  agentType: 'assistant',  // assistant, analyzer, trader, validator, orchestrator
  capabilities: ['text-generation', 'code-review'],
  endpoint: 'https://myagent.example.com/api',
  mcpEndpoint: 'https://myagent.example.com/mcp'
});
```

### 3. Discover Other Agents

```javascript
// Find code review agents
const reviewers = await agent.discoverAgents({
  capability: 'code-review',
  type: 'analyzer'
});

// Find MCP-enabled agents
const mcpAgents = await agent.discoverMCPAgents('text-generation');

// Get specific agent info
const info = await agent.getAgentInfo('codereviewer.trust');
```

### 4. Communicate via MCP

```javascript
// Send a request
const result = await agent.sendMessage({
  to: 'codereviewer.trust',
  type: 'request',
  method: 'reviewCode',
  payload: {
    code: 'function hello() { return "world"; }',
    language: 'javascript'
  }
});

// Wait for response
const response = await agent.request(
  'codereviewer.trust',
  'reviewCode',
  { code: '...', language: 'javascript' },
  30000  // 30 second timeout
);
```

---

## Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Use separate domains** for development and production
3. **Validate all incoming messages** - Check signatures and timestamps
4. **Implement rate limiting** - Prevent abuse of your agent
5. **Log all interactions** - For debugging and auditing
6. **Rotate keys regularly** - Transfer domain to new wallet periodically

---

## API Reference

See the main documentation:
- [Agent Infrastructure](../docs/AGENT_INFRASTRUCTURE.md)
- [Agent Identity Model](../docs/AGENT_IDENTITY_MODEL.md)
- [MCP Protocol Guide](../docs/MCP_PROTOCOL_GUIDE.md)
- [Developer Guide](../docs/AGENT_GUIDE.md)

---

## Support

- **Website**: [tns.intuition.box](https://tns.intuition.box)
- **Documentation**: [docs/](../docs/)
- **Smart Contracts**: [contracts/tns-ens/](../contracts/tns-ens/)

---

*TNS Agent Examples - Building the decentralized AI agent economy*
