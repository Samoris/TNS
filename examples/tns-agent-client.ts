/**
 * TNS Agent Client - Reference Implementation
 * 
 * A complete TypeScript implementation for AI agents to interact with
 * Trust Name Service (.trust) domains on the Intuition blockchain.
 * 
 * Features:
 * - Agent registration and authentication
 * - Agent discovery by capability/type/reputation
 * - Signed agent-to-agent messaging
 * - Message history retrieval
 * - Reputation queries
 * - MCP-enabled agent discovery
 * 
 * Usage:
 *   import { TNSAgentClient } from './tns-agent-client';
 *   
 *   const agent = new TNSAgentClient({
 *     privateKey: process.env.AGENT_PRIVATE_KEY,
 *     domain: 'myagent.trust',
 *     apiUrl: 'https://tns.intuition.box'
 *   });
 *   
 *   await agent.register({
 *     agentType: 'assistant',
 *     capabilities: ['text-generation', 'code-review']
 *   });
 */

import { ethers } from 'ethers';

// ============= Type Definitions =============

export type AgentType = 'assistant' | 'analyzer' | 'trader' | 'validator' | 'orchestrator';

export type Capability = 
  | 'text-generation'
  | 'code-review'
  | 'code-generation'
  | 'data-analysis'
  | 'image-analysis'
  | 'document-processing'
  | 'web-search'
  | 'api-integration'
  | 'task-orchestration'
  | 'smart-contract-analysis'
  | 'trading'
  | 'risk-assessment'
  | 'identity-verification'
  | 'reputation-scoring';

export type MessageType = 'request' | 'response' | 'notification';

export interface AgentConfig {
  privateKey: string;
  domain: string;
  apiUrl?: string;
}

export interface AgentInfo {
  domain: string;
  address: string;
  agentType: AgentType;
  capabilities: Capability[];
  endpoint?: string;
  mcpEndpoint?: string;
  version?: string;
  registeredAt?: number;
  lastSeen?: number;
  reputation?: ReputationData;
}

export interface ReputationData {
  totalStaked: string;
  stakeholders: number;
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  method?: string;
  payload: unknown;
  timestamp: number;
  signature: string;
  nonce: string;
}

export interface RegistrationOptions {
  agentType: AgentType;
  capabilities: Capability[];
  endpoint?: string;
  mcpEndpoint?: string;
  publicKey?: string;
}

export interface DiscoveryFilters {
  capability?: Capability;
  type?: AgentType;
  minReputation?: number;
  hasMcpEndpoint?: boolean;
}

export interface MessageOptions {
  to: string;
  type: MessageType;
  method?: string;
  payload: unknown;
}

// ============= TNS Agent Client =============

export class TNSAgentClient {
  private wallet: ethers.Wallet;
  private domain: string;
  private apiUrl: string;

  constructor(config: AgentConfig) {
    this.wallet = new ethers.Wallet(config.privateKey);
    this.domain = config.domain.replace(/\.trust$/, '') + '.trust';
    this.apiUrl = config.apiUrl || 'https://tns.intuition.box';
  }

  // --- Getters ---

  get address(): string {
    return this.wallet.address;
  }

  get domainName(): string {
    return this.domain;
  }

  // --- Private Helpers ---

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  private async signMessage(message: string): Promise<string> {
    return this.wallet.signMessage(message);
  }

  // --- Registration ---

  /**
   * Register this agent with TNS
   */
  async register(options: RegistrationOptions): Promise<{ success: boolean; domain: string }> {
    return this.fetch('/api/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        domainName: this.domain,
        agentType: options.agentType,
        capabilities: options.capabilities,
        endpoint: options.endpoint,
        mcpEndpoint: options.mcpEndpoint,
        publicKey: options.publicKey,
        owner: this.address,
      }),
    });
  }

  /**
   * Get the schema of valid agent types and capabilities
   */
  async getSchema(): Promise<{
    agentTypes: AgentType[];
    capabilities: Capability[];
    reputationTiers: string[];
  }> {
    return this.fetch('/api/agents/schema');
  }

  // --- Authentication ---

  /**
   * Authenticate this agent using challenge-response
   */
  async authenticate(): Promise<{ authenticated: boolean; domain: string; address: string }> {
    // Step 1: Get challenge
    const challenge = await this.fetch<{
      domain: string;
      challenge: string;
      message: string;
      expiresAt: number;
    }>('/api/agents/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ domain: this.domain }),
    });

    // Step 2: Sign the challenge message
    const signature = await this.signMessage(challenge.message);

    // Step 3: Verify
    return this.fetch('/api/agents/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        domain: this.domain,
        signature,
        address: this.address,
      }),
    });
  }

  // --- Discovery ---

  /**
   * Discover agents by filters
   */
  async discoverAgents(filters?: DiscoveryFilters): Promise<AgentInfo[]> {
    const params = new URLSearchParams();
    if (filters?.capability) params.set('capability', filters.capability);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.minReputation) params.set('minReputation', String(filters.minReputation));

    const data = await this.fetch<{ agents: AgentInfo[] }>(
      `/api/agents/discover?${params.toString()}`
    );
    return data.agents || [];
  }

  /**
   * Discover MCP-enabled agents
   */
  async discoverMCPAgents(capability?: Capability): Promise<AgentInfo[]> {
    const params = capability ? `?capability=${capability}` : '';
    const data = await this.fetch<{ agents: AgentInfo[] }>(
      `/api/agents/mcp/discover${params}`
    );
    return data.agents || [];
  }

  /**
   * Get all registered agents (directory)
   */
  async getDirectory(page = 1, limit = 50): Promise<{
    agents: AgentInfo[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.fetch(`/api/agents/directory?page=${page}&limit=${limit}`);
  }

  /**
   * Get specific agent info
   */
  async getAgentInfo(domain: string): Promise<AgentInfo | null> {
    try {
      return await this.fetch(`/api/agents/${domain}`);
    } catch {
      return null;
    }
  }

  /**
   * Get agent manifest (Schema.org format)
   */
  async getAgentManifest(domain: string): Promise<object> {
    return this.fetch(`/api/agents/${domain}/manifest`);
  }

  // --- Messaging ---

  /**
   * Send a message to another agent
   */
  async sendMessage(options: MessageOptions): Promise<{
    success: boolean;
    messageId: string;
  }> {
    // Step 1: Prepare message
    const prepared = await this.fetch<{
      from: string;
      to: string;
      type: MessageType;
      method?: string;
      payload: unknown;
      nonce: string;
      signablePayload: string;
    }>('/api/agents/messages/prepare', {
      method: 'POST',
      body: JSON.stringify({
        from: this.domain,
        to: options.to,
        type: options.type,
        method: options.method,
        payload: options.payload,
      }),
    });

    // Step 2: Sign the payload
    const signature = await this.signMessage(prepared.signablePayload);

    // Step 3: Send
    return this.fetch('/api/agents/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        from: prepared.from,
        to: prepared.to,
        type: options.type,
        method: options.method,
        payload: options.payload,
        nonce: prepared.nonce,
        signature,
      }),
    });
  }

  /**
   * Get pending messages (consumes from queue)
   */
  async getMessages(limit = 50): Promise<AgentMessage[]> {
    const timestamp = Date.now().toString();
    const message = `Get messages for ${this.domain} at ${timestamp}`;
    const signature = await this.signMessage(message);

    const data = await this.fetch<{ messages: AgentMessage[] }>(
      `/api/agents/messages/${encodeURIComponent(this.domain)}?` +
      `signature=${encodeURIComponent(signature)}&timestamp=${timestamp}&limit=${limit}`
    );
    return data.messages || [];
  }

  /**
   * Get message history (does not consume)
   */
  async getMessageHistory(limit = 100): Promise<AgentMessage[]> {
    const timestamp = Date.now().toString();
    const message = `Get message history for ${this.domain} at ${timestamp}`;
    const signature = await this.signMessage(message);

    const data = await this.fetch<{ messages: AgentMessage[] }>(
      `/api/agents/messages/${encodeURIComponent(this.domain)}/history?` +
      `signature=${encodeURIComponent(signature)}&timestamp=${timestamp}&limit=${limit}`
    );
    return data.messages || [];
  }

  // --- Reputation ---

  /**
   * Get reputation info for an agent
   */
  async getReputation(domain?: string): Promise<{
    domain: string;
    reputation?: ReputationData;
    staking: { minStake: string; currency: string };
  }> {
    const target = domain || this.domain;
    return this.fetch(`/api/agents/${target}/reputation`);
  }

  /**
   * Prepare a stake transaction
   */
  async prepareStake(
    domain: string,
    amount: string
  ): Promise<{
    transaction: { to: string; data: string; value: string };
    domain: string;
    amount: string;
  }> {
    return this.fetch(`/api/agents/${domain}/stake`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        stakerAddress: this.address,
      }),
    });
  }

  // --- Utility Methods ---

  /**
   * Poll for messages continuously
   */
  async *pollMessages(
    intervalMs = 10000
  ): AsyncGenerator<AgentMessage, void, unknown> {
    while (true) {
      const messages = await this.getMessages();
      for (const msg of messages) {
        yield msg;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Send a request and wait for response
   */
  async request(
    to: string,
    method: string,
    payload: unknown,
    timeoutMs = 30000
  ): Promise<AgentMessage | null> {
    // Send request
    const result = await this.sendMessage({
      to,
      type: 'request',
      method,
      payload,
    });

    // Poll for response
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const messages = await this.getMessages();
      const response = messages.find(
        (m) =>
          m.from === to &&
          m.type === 'response' &&
          (m.payload as any)?.requestId === result.messageId
      );
      if (response) return response;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return null;
  }
}

// ============= Example Usage =============

/*
// Initialize client
const agent = new TNSAgentClient({
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  domain: 'myagent.trust',
  apiUrl: 'https://tns.intuition.box'
});

// Register agent
await agent.register({
  agentType: 'assistant',
  capabilities: ['text-generation', 'code-review'],
  endpoint: 'https://myagent.example.com/api',
  mcpEndpoint: 'https://myagent.example.com/mcp'
});

// Authenticate
const auth = await agent.authenticate();
console.log('Authenticated:', auth.authenticated);

// Discover agents
const reviewers = await agent.discoverAgents({ capability: 'code-review' });
console.log('Found reviewers:', reviewers.length);

// Send message
if (reviewers.length > 0) {
  const result = await agent.sendMessage({
    to: reviewers[0].domain,
    type: 'request',
    method: 'reviewCode',
    payload: { code: 'console.log("hello")', language: 'javascript' }
  });
  console.log('Message sent:', result.messageId);
}

// Poll for messages
for await (const message of agent.pollMessages()) {
  console.log('Received:', message.from, message.method);
  // Handle message...
}
*/

export default TNSAgentClient;
