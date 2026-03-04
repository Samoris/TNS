# TNS Agent Identity Model

Comprehensive documentation on AI agent identity model, lifecycle management, and security considerations.

---

## Table of Contents

1. [Identity Overview](#identity-overview)
2. [Human vs Agent Identities](#human-vs-agent-identities)
3. [Agent Identity Lifecycle](#agent-identity-lifecycle)
4. [Security Considerations](#security-considerations)
5. [Best Practices](#best-practices)

---

## Identity Overview

TNS provides AI agents with decentralized, verifiable identities through `.trust` domains. Each identity is:

- **On-chain**: Registered on the Intuition blockchain (Chain ID: 1155)
- **Cryptographically Verifiable**: Ownership proven through ECDSA signatures
- **Self-Sovereign**: Controlled by the domain owner's private key
- **Discoverable**: Indexed in the Knowledge Graph for agent discovery

### Identity Components

| Component | Description |
|-----------|-------------|
| **Domain** | The `.trust` name (e.g., `myagent.trust`) |
| **Address** | Ethereum-compatible wallet address that owns the domain |
| **Agent Type** | Classification: assistant, analyzer, trader, validator, orchestrator |
| **Capabilities** | List of abilities the agent can perform |
| **Endpoints** | API and MCP endpoints for communication |
| **Public Key** | Optional: For agent-to-agent encrypted communication |
| **Reputation** | Staking-based trust score from Knowledge Graph |

### Identity Record Structure

```typescript
interface AgentIdentity {
  domain: string;           // e.g., "myagent.trust"
  address: string;          // Owner wallet address
  publicKey?: string;       // Optional ECDSA public key
  agentType: AgentType;     // Type classification
  capabilities: string[];   // Capability list
  endpoint?: string;        // REST API endpoint
  mcpEndpoint?: string;     // MCP protocol endpoint
  version: string;          // Semantic version
  registeredAt: number;     // Unix timestamp
  lastSeen?: number;        // Last activity timestamp
  reputation?: {
    score: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    totalStaked: string;
    stakeholders: number;
  };
}
```

---

## Human vs Agent Identities

TNS supports both human-controlled and autonomous agent-controlled identities. Understanding the distinction is critical for security and trust.

### Human-Controlled Identities

Human-controlled `.trust` domains are managed by individuals:

| Characteristic | Description |
|----------------|-------------|
| **Key Management** | Private key stored in hardware wallet, browser wallet, or secure enclave |
| **Signing** | Transactions signed manually by human operator |
| **Recovery** | Standard wallet recovery (seed phrase) |
| **Use Cases** | Personal identity, brand domains, project namespaces |

**Indicators of Human Control:**
- No `endpoint` or `mcpEndpoint` registered
- No agent metadata in resolver records
- Primary use for receiving payments, not API calls

### Agent-Controlled Identities

Autonomous agents manage their own `.trust` domains programmatically:

| Characteristic | Description |
|----------------|-------------|
| **Key Management** | Private key stored in HSM, secure enclave, or cloud KMS |
| **Signing** | Automated signing by agent software |
| **Recovery** | Requires key rotation or multi-sig recovery |
| **Use Cases** | Autonomous AI services, trading bots, oracle providers |

**Indicators of Agent Control:**
- Has `agentType` and `capabilities` registered
- Has `endpoint` and/or `mcpEndpoint` 
- Active message history and authentication challenges
- Regular `lastSeen` updates

### Hybrid Identities

Some identities may be human-operated agents:

```
┌─────────────────────────────────────────┐
│         Human-Operated Agent            │
├─────────────────────────────────────────┤
│  • Human holds signing keys             │
│  • Agent software handles operations    │
│  • Human approves high-risk actions     │
│  • Best of both worlds                  │
└─────────────────────────────────────────┘
```

### Distinguishing Identities

Query an identity to determine its type:

```javascript
const agentInfo = await fetch('/api/agents/myidentity.trust').then(r => r.json());

if (agentInfo.error === 'Not registered as an agent') {
  // Likely human-controlled identity
  console.log('Human or unregistered identity');
} else {
  // Agent-controlled identity
  console.log('Agent type:', agentInfo.agentType);
  console.log('Capabilities:', agentInfo.capabilities);
}
```

---

## Agent Identity Lifecycle

### 1. Creation

```
┌──────────────────────────────────────────────────────────────┐
│                     CREATION PHASE                           │
├──────────────────────────────────────────────────────────────┤
│  1. Generate wallet keypair (secure environment)             │
│  2. Acquire TRUST tokens for registration                    │
│  3. Register .trust domain via commit-reveal                 │
│  4. Register agent metadata (type, capabilities, endpoints)  │
│  5. Sync to Knowledge Graph (create atom)                    │
│  6. Optionally stake TRUST for initial reputation            │
└──────────────────────────────────────────────────────────────┘
```

**Code Example:**

```javascript
// 1. Generate or load wallet
const wallet = ethers.Wallet.createRandom();
console.log('Agent address:', wallet.address);
console.log('SECURE YOUR PRIVATE KEY:', wallet.privateKey);

// 2-3. Register domain (via UI or contract interaction)
// Use tns.intuition.box for registration

// 4. Register agent metadata
await fetch('/api/agents/register', {
  method: 'POST',
  body: JSON.stringify({
    domainName: 'myagent.trust',
    agentType: 'assistant',
    capabilities: ['text-generation', 'code-review'],
    endpoint: 'https://myagent.example.com/api',
    owner: wallet.address
  })
});

// 5. Sync to Knowledge Graph (done automatically or via /api/sync)
```

### 2. Active Operation

During active operation, agents should:

- **Authenticate regularly**: Prove ownership via challenge-response
- **Update lastSeen**: Indicate the agent is operational
- **Monitor messages**: Poll for incoming agent-to-agent messages
- **Build reputation**: Stake TRUST or receive stakes from users

```javascript
class AgentOperations {
  async heartbeat() {
    // Authenticate to update lastSeen
    const challenge = await this.getChallenge();
    const signature = await this.wallet.signMessage(challenge.message);
    await this.verify(signature);
  }

  async pollMessages() {
    const timestamp = Date.now().toString();
    const message = `Get messages for ${this.domain} at ${timestamp}`;
    const signature = await this.wallet.signMessage(message);
    return this.fetchMessages(signature, timestamp);
  }
}

// Run heartbeat every 30 minutes
setInterval(() => agent.heartbeat(), 30 * 60 * 1000);
```

### 3. Key Rotation

Key rotation is critical for security. TNS supports key rotation through domain transfer:

```
┌──────────────────────────────────────────────────────────────┐
│                     KEY ROTATION                             │
├──────────────────────────────────────────────────────────────┤
│  1. Generate new wallet keypair (secure environment)         │
│  2. Transfer domain NFT to new address                       │
│  3. Update agent metadata with new owner                     │
│  4. Securely destroy old private key                         │
│  5. Update all systems using the agent identity              │
└──────────────────────────────────────────────────────────────┘
```

**Important**: Domain transfer is an on-chain operation:

```javascript
// Using BaseRegistrar contract
const registrar = new ethers.Contract(
  '0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629',
  ['function safeTransferFrom(address from, address to, uint256 tokenId)'],
  oldWallet
);

// Get token ID (keccak256 of label)
const labelHash = ethers.keccak256(ethers.toUtf8Bytes('myagent'));
await registrar.safeTransferFrom(oldWallet.address, newWallet.address, labelHash);
```

### 4. Deprecation

When an agent identity is no longer needed:

```
┌──────────────────────────────────────────────────────────────┐
│                     DEPRECATION                              │
├──────────────────────────────────────────────────────────────┤
│  Option A: Let Domain Expire                                 │
│  • Stop renewing the domain                                  │
│  • After expiry + 90-day grace period, domain becomes        │
│    available for re-registration                             │
│                                                              │
│  Option B: Transfer to Burn Address                          │
│  • Transfer NFT to 0x000...dead                              │
│  • Domain is permanently locked                              │
│                                                              │
│  Option C: Remove Agent Metadata Only                        │
│  • Clear agent records from resolver                         │
│  • Keep domain for other purposes                            │
└──────────────────────────────────────────────────────────────┘
```

**Removing agent metadata:**

```javascript
// Clear agent-specific resolver records
await fetch('/api/agents/myagent/records', {
  method: 'DELETE',
  body: JSON.stringify({
    signature: await wallet.signMessage('Remove agent records'),
    owner: wallet.address
  })
});
```

---

## Security Considerations

### 1. Private Key Management

| Environment | Recommended Storage |
|-------------|---------------------|
| Development | Environment variables (never commit) |
| Production | Cloud KMS (AWS, GCP, Azure) |
| High Security | Hardware Security Module (HSM) |
| Enterprise | Multi-signature wallets |

**NEVER:**
- Commit private keys to source control
- Store keys in plaintext configuration files
- Share keys between multiple agents
- Use the same key for mainnet and testnet

### 2. Signing Security

```javascript
// GOOD: Sign only verified, prepared messages
const prepared = await fetch('/api/agents/messages/prepare', {...});
const signature = await wallet.signMessage(prepared.signablePayload);

// BAD: Never sign arbitrary content from untrusted sources
const signature = await wallet.signMessage(untrustedContent); // DANGEROUS
```

### 3. Message Validation

Always validate incoming messages:

```javascript
function validateMessage(message) {
  // Check timestamp freshness (prevent replay)
  if (Date.now() - message.timestamp > 5 * 60 * 1000) {
    throw new Error('Message too old');
  }

  // Verify sender domain exists
  const sender = await fetch(`/api/agents/${message.from}`);
  if (!sender.ok) {
    throw new Error('Unknown sender');
  }

  // Check sender reputation
  const rep = await fetch(`/api/agents/${message.from}/reputation`);
  if (rep.reputation?.score < 10) {
    console.warn('Low reputation sender');
  }

  return true;
}
```

### 4. Endpoint Security

If your agent exposes an API endpoint:

- **Use HTTPS only**: Never expose HTTP endpoints
- **Validate signatures**: Verify message signatures before processing
- **Rate limit**: Prevent denial-of-service attacks
- **Authenticate callers**: Require valid `.trust` identity
- **Audit logging**: Log all incoming requests

### 5. Knowledge Graph Considerations

- **Public visibility**: All Knowledge Graph data is public
- **Stake carefully**: Staking is economic commitment
- **Monitor reputation**: Track your agent's reputation score
- **Verify atoms**: Confirm atom creation before relying on it

---

## Best Practices

### For Agent Developers

1. **Use separate domains for development and production**
   - `myagent-dev.trust` for testing
   - `myagent.trust` for production

2. **Implement graceful degradation**
   - Handle network failures
   - Queue messages when peers unavailable
   - Retry with exponential backoff

3. **Version your agent**
   - Update `version` field in registration
   - Maintain backward compatibility
   - Document breaking changes

4. **Monitor agent health**
   - Track authentication success rate
   - Monitor message delivery
   - Alert on reputation changes

### For Agent Operators

1. **Regular key rotation**
   - Rotate keys at least quarterly
   - Immediately rotate if compromise suspected

2. **Backup procedures**
   - Document recovery process
   - Test recovery regularly
   - Maintain offline key backup

3. **Incident response**
   - Plan for key compromise
   - Know how to deprecate quickly
   - Communicate with stakeholders

### For Agent Users

1. **Verify agent identity**
   - Check domain ownership on-chain
   - Verify capabilities match needs
   - Check reputation score

2. **Monitor interactions**
   - Log all agent communications
   - Validate response signatures
   - Report suspicious behavior

---

## Summary

TNS provides a robust identity framework for AI agents:

| Feature | Support |
|---------|---------|
| Decentralized Identity | ✅ On-chain domain ownership |
| Cryptographic Verification | ✅ ECDSA signatures |
| Human vs Agent Distinction | ✅ Agent metadata registration |
| Lifecycle Management | ✅ Creation, rotation, deprecation |
| Security | ✅ Challenge-response, signature verification |
| Discovery | ✅ Capability-based agent discovery |
| Reputation | ✅ Staking-based trust scores |

For implementation details, see:
- [Agent Infrastructure Guide](./AGENT_INFRASTRUCTURE.md)
- [Developer Guide](./AGENT_GUIDE.md)
- [MCP Protocol Guide](./MCP_PROTOCOL_GUIDE.md)
