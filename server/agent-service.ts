import { ethers } from 'ethers';
import { intuitionService } from './intuition';
import { storage } from './storage';
import type { AgentMessageRow } from '@shared/schema';

const INTUITION_RPC = 'https://intuition.calderachain.xyz';
const MULTIVAULT_ADDRESS = '0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e';

const MULTIVAULT_ABI = [
  'function depositAtom(address receiver, uint256 id) external payable returns (uint256 shares)',
  'function redeemAtom(uint256 shares, address receiver, uint256 id) external returns (uint256 assets)',
  'function getAtomCost() external view returns (uint256)',
  'function atoms(uint256 id) external view returns (uint256 vaultId, string memory uri)',
  'function createAtom(bytes calldata atomUri) external payable returns (uint256)',
  'function createTriple(uint256 subjectId, uint256 predicateId, uint256 objectId) external payable returns (uint256)',
  'function getTripleId(uint256 subjectId, uint256 predicateId, uint256 objectId) external view returns (uint256)',
  'function atomsByUri(string memory uri) external view returns (uint256)',
];

export interface AgentIdentity {
  domain: string;
  address: string;
  publicKey: string;
  agentType: 'assistant' | 'analyzer' | 'trader' | 'validator' | 'orchestrator';
  capabilities: string[];
  endpoint?: string;
  mcpEndpoint?: string;
  version: string;
  registeredAt: number;
  lastSeen?: number;
  reputation?: AgentReputation;
}

export interface AgentReputation {
  totalStaked: string;
  stakeholders: number;
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  payload: unknown;
  timestamp: number;
  signature: string;
  nonce: string;
}

export interface AgentChallenge {
  challenge: string;
  timestamp: number;
  expiresAt: number;
}

export interface StakeOperation {
  type: 'deposit' | 'redeem';
  agentDomain: string;
  amount: string;
  shares?: string;
}

const VALID_AGENT_TYPES = ['assistant', 'analyzer', 'trader', 'validator', 'orchestrator'];
const VALID_CAPABILITIES = [
  'text-generation',
  'code-review',
  'code-generation',
  'data-analysis',
  'image-analysis',
  'document-processing',
  'web-search',
  'api-integration',
  'task-orchestration',
  'smart-contract-analysis',
  'trading',
  'risk-assessment',
  'identity-verification',
  'reputation-scoring',
];

const challenges = new Map<string, AgentChallenge>();

export class AgentService {
  private provider: ethers.JsonRpcProvider;
  private multivault: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(INTUITION_RPC);
    this.multivault = new ethers.Contract(MULTIVAULT_ADDRESS, MULTIVAULT_ABI, this.provider);
  }

  validateAgentRegistration(data: {
    domainName: string;
    agentType: string;
    capabilities: string[];
    endpoint?: string;
    mcpEndpoint?: string;
    publicKey?: string;
    owner: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.domainName || data.domainName.length < 3) {
      errors.push('Domain name must be at least 3 characters');
    }

    if (!VALID_AGENT_TYPES.includes(data.agentType)) {
      errors.push(`Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}`);
    }

    if (!Array.isArray(data.capabilities) || data.capabilities.length === 0) {
      errors.push('At least one capability is required');
    } else {
      const invalidCaps = data.capabilities.filter(c => !VALID_CAPABILITIES.includes(c));
      if (invalidCaps.length > 0) {
        errors.push(`Invalid capabilities: ${invalidCaps.join(', ')}. Valid: ${VALID_CAPABILITIES.join(', ')}`);
      }
    }

    if (!data.owner || !ethers.isAddress(data.owner)) {
      errors.push('Valid owner address is required');
    }

    if (data.publicKey && !this.isValidPublicKey(data.publicKey)) {
      errors.push('Invalid public key format');
    }

    if (data.endpoint && !this.isValidUrl(data.endpoint)) {
      errors.push('Invalid endpoint URL');
    }

    if (data.mcpEndpoint && !this.isValidUrl(data.mcpEndpoint)) {
      errors.push('Invalid MCP endpoint URL');
    }

    return { valid: errors.length === 0, errors };
  }

  private isValidPublicKey(key: string): boolean {
    if (key.startsWith('0x')) {
      return key.length === 132 || key.length === 68;
    }
    return key.length >= 64;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  generateChallenge(domain: string): AgentChallenge {
    const challenge = ethers.hexlify(ethers.randomBytes(32));
    const timestamp = Date.now();
    const expiresAt = timestamp + 5 * 60 * 1000;

    const challengeData: AgentChallenge = { challenge, timestamp, expiresAt };
    challenges.set(domain, challengeData);

    return challengeData;
  }

  async verifyAgentSignature(
    domain: string,
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  async verifyAgentChallenge(
    domain: string,
    signature: string,
    expectedAddress: string
  ): Promise<{ valid: boolean; error?: string }> {
    const challengeData = challenges.get(domain);

    if (!challengeData) {
      return { valid: false, error: 'No challenge found for this domain' };
    }

    if (Date.now() > challengeData.expiresAt) {
      challenges.delete(domain);
      return { valid: false, error: 'Challenge expired' };
    }

    const message = `TNS Agent Authentication\nDomain: ${domain}\nChallenge: ${challengeData.challenge}\nTimestamp: ${challengeData.timestamp}`;

    const isValid = await this.verifyAgentSignature(domain, message, signature, expectedAddress);

    if (isValid) {
      challenges.delete(domain);
    }

    return { valid: isValid, error: isValid ? undefined : 'Invalid signature' };
  }

  async verifyMessageSignature(message: AgentMessage, senderAddress: string): Promise<boolean> {
    // Only verify over fields the client controls/provides
    const payload = JSON.stringify({
      from: message.from,
      to: message.to,
      type: message.type,
      method: message.method || null,
      payload: message.payload,
      nonce: message.nonce,
    });

    return this.verifyAgentSignature(message.from, payload, message.signature, senderAddress);
  }

  createSignableMessagePayload(from: string, to: string, type: string, method: string | undefined, payload: unknown, nonce: string): string {
    return JSON.stringify({
      from,
      to,
      type,
      method: method || null,
      payload,
      nonce,
    });
  }

  private rowToMessage(row: AgentMessageRow): AgentMessage {
    let payload: unknown = row.payload;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      // leave as raw string if it isn't JSON
    }
    return {
      id: row.id,
      from: row.fromDomain,
      to: row.toDomain,
      type: row.type as AgentMessage['type'],
      method: row.method || undefined,
      payload,
      timestamp: row.sentAt.getTime(),
      signature: row.signature,
      nonce: row.nonce,
    };
  }

  async sendMessage(message: AgentMessage): Promise<{ success: boolean; error?: string }> {
    if (!message.from || !message.to) {
      return { success: false, error: 'From and to domains are required' };
    }

    if (Date.now() - message.timestamp > 5 * 60 * 1000) {
      return { success: false, error: 'Message timestamp too old' };
    }

    // Durably persist the message; it acts as both the recipient's inbox
    // (delivered=false) and permanent history for both parties. The unique
    // (from_domain, nonce) constraint rejects replays of a captured signed
    // payload.
    try {
      await storage.createAgentMessage({
        fromDomain: message.from,
        toDomain: message.to,
        type: message.type,
        method: message.method || null,
        payload: typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload),
        signature: message.signature,
        nonce: message.nonce,
      });
    } catch (error: any) {
      // Postgres unique-violation code = 23505
      if (error?.code === '23505') {
        return { success: false, error: 'Duplicate message (nonce already used) — possible replay' };
      }
      throw error;
    }

    return { success: true };
  }

  async getMessages(domain: string, limit: number = 50): Promise<AgentMessage[]> {
    // Inbox semantics: return undelivered messages, then mark them delivered so
    // they aren't returned again (history endpoint still retains them).
    const rows = await storage.getUndeliveredMessages(domain, limit);
    if (rows.length > 0) {
      await storage.markMessagesDelivered(rows.map(r => r.id));
    }
    return rows.map(r => this.rowToMessage(r));
  }

  async getMessageHistory(domain: string, limit: number = 100): Promise<AgentMessage[]> {
    const rows = await storage.getAgentMessageHistory(domain, limit);
    return rows.map(r => this.rowToMessage(r));
  }

  async discoverAgents(filters: {
    capability?: string;
    type?: string;
    minReputation?: number;
    hasEndpoint?: boolean;
    hasMcpEndpoint?: boolean;
  }): Promise<AgentIdentity[]> {
    const dbAgents = await storage.getAllAgents();
    
    const agents: AgentIdentity[] = await Promise.all(dbAgents.map(async (a) => {
      const reputation = await this.getAgentReputation(a.domain);
      return {
        domain: a.domain,
        address: a.address,
        publicKey: a.publicKey || '',
        agentType: a.agentType as AgentIdentity['agentType'],
        capabilities: a.capabilities,
        endpoint: a.endpoint || undefined,
        mcpEndpoint: a.mcpEndpoint || undefined,
        version: a.version || '1.0.0',
        registeredAt: a.registeredAt?.getTime() || Date.now(),
        lastSeen: a.lastSeen?.getTime(),
        reputation: reputation || undefined,
      };
    }));

    return agents.filter(agent => {
      if (filters.capability && !agent.capabilities.includes(filters.capability)) {
        return false;
      }
      if (filters.type && agent.agentType !== filters.type) {
        return false;
      }
      if (filters.minReputation && (!agent.reputation || agent.reputation.score < filters.minReputation)) {
        return false;
      }
      if (filters.hasEndpoint && !agent.endpoint) {
        return false;
      }
      if (filters.hasMcpEndpoint && !agent.mcpEndpoint) {
        return false;
      }
      return true;
    });
  }

  async getMcpDiscoveryInfo(domain: string): Promise<{
    domain: string;
    mcpVersion: string;
    capabilities: string[];
    tools: Array<{ name: string; description: string }>;
    resources: Array<{ uri: string; name: string }>;
  } | null> {
    const agent = await storage.getAgent(domain);
    if (!agent || !agent.mcpEndpoint) {
      return null;
    }

    try {
      const response = await fetch(`${agent.mcpEndpoint}/.well-known/mcp.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('MCP discovery failed:', error);
    }

    return {
      domain,
      mcpVersion: '1.0',
      capabilities: agent.capabilities,
      tools: [],
      resources: [],
    };
  }

  async registerAgent(agent: AgentIdentity): Promise<void> {
    const existing = await storage.getAgent(agent.domain);
    
    if (existing) {
      await storage.updateAgent(agent.domain, {
        address: agent.address,
        publicKey: agent.publicKey || null,
        agentType: agent.agentType,
        capabilities: agent.capabilities,
        endpoint: agent.endpoint || null,
        mcpEndpoint: agent.mcpEndpoint || null,
        version: agent.version,
        lastSeen: new Date(),
      });
    } else {
      await storage.createAgent({
        domain: agent.domain,
        address: agent.address,
        publicKey: agent.publicKey || null,
        agentType: agent.agentType,
        capabilities: agent.capabilities,
        endpoint: agent.endpoint || null,
        mcpEndpoint: agent.mcpEndpoint || null,
        version: agent.version,
      });
    }
  }

  async updateAgentLastSeen(domain: string): Promise<void> {
    await storage.updateAgent(domain, { lastSeen: new Date() });
  }

  private tierForScore(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (score >= 100) return 'platinum';
    if (score >= 50) return 'gold';
    if (score >= 20) return 'silver';
    return 'bronze';
  }

  // Deterministic baseline score derived from an agent's own profile, so newly
  // registered agents (with no on-chain stake yet) still get a meaningful,
  // comparable reputation instead of showing nothing.
  private computeProfileScore(agent: {
    capabilities: string[];
    endpoint?: string | null;
    mcpEndpoint?: string | null;
    publicKey?: string | null;
    lastSeen?: Date | null;
  }): number {
    let score = 5; // base for being registered
    score += Math.min(agent.capabilities?.length || 0, 6) * 2; // up to +12
    if (agent.endpoint) score += 5;
    if (agent.mcpEndpoint) score += 8; // MCP-enabled agents are more useful
    if (agent.publicKey) score += 3;
    // Recency: active within 7 days boosts score, decaying to 0 over 30 days.
    if (agent.lastSeen) {
      const days = (Date.now() - agent.lastSeen.getTime()) / (24 * 60 * 60 * 1000);
      if (days <= 7) score += 6;
      else if (days <= 30) score += 3;
    }
    return score;
  }

  // Fast, RPC-free reputation for list views: derives a score purely from the
  // stored agent profile plus any cached stake figures.
  buildProfileReputation(agent: {
    capabilities: string[];
    endpoint?: string | null;
    mcpEndpoint?: string | null;
    publicKey?: string | null;
    lastSeen?: Date | null;
    totalStaked?: string | null;
    stakeholders?: number | null;
  }): AgentReputation {
    const score = this.computeProfileScore(agent);
    return {
      totalStaked: agent.totalStaked || '0',
      stakeholders: agent.stakeholders || 0,
      score,
      tier: this.tierForScore(score),
    };
  }

  async getAgentReputation(domain: string): Promise<AgentReputation | null> {
    let onChainStaked = '0';
    let stakeholders = 0;
    let onChainScore = 0;

    try {
      const reputation = await intuitionService.getDomainReputation(domain);
      if (reputation) {
        onChainStaked = reputation.totalStaked;
        stakeholders = reputation.stakeholders;
        onChainScore = reputation.reputationScore;
      }
    } catch (error) {
      console.error('Error getting on-chain agent reputation:', error);
    }

    // Blend the on-chain reputation (if any) with a profile-derived baseline so
    // the value is always present and meaningful.
    let profileScore = 5;
    try {
      const agent = await storage.getAgent(domain);
      if (agent) {
        profileScore = this.computeProfileScore(agent);
      }
    } catch {
      // fall back to base profile score
    }

    const score = Math.round(onChainScore + profileScore);

    return {
      totalStaked: onChainStaked,
      stakeholders,
      score,
      tier: this.tierForScore(score),
    };
  }

  async prepareStakeTransaction(
    agentDomain: string,
    amount: string,
    stakerAddress: string
  ): Promise<{
    to: string;
    data: string;
    value: string;
    atomId?: string;
  } | null> {
    try {
      const uri = intuitionService.generateAgentAtomUri(agentDomain.replace('.trust', ''));
      let atomId: string;

      try {
        atomId = await this.multivault.atomsByUri(uri);
        if (atomId === '0' || !atomId) {
          return null;
        }
      } catch {
        return null;
      }

      const iface = new ethers.Interface(MULTIVAULT_ABI);
      const data = iface.encodeFunctionData('depositAtom', [stakerAddress, atomId]);

      return {
        to: MULTIVAULT_ADDRESS,
        data,
        value: ethers.parseEther(amount).toString(),
        atomId,
      };
    } catch (error) {
      console.error('Error preparing stake transaction:', error);
      return null;
    }
  }

  async prepareUnstakeTransaction(
    agentDomain: string,
    shares: string,
    receiverAddress: string
  ): Promise<{
    to: string;
    data: string;
    atomId?: string;
  } | null> {
    try {
      const uri = intuitionService.generateAgentAtomUri(agentDomain.replace('.trust', ''));
      let atomId: string;

      try {
        atomId = await this.multivault.atomsByUri(uri);
        if (atomId === '0' || !atomId) {
          return null;
        }
      } catch {
        return null;
      }

      const iface = new ethers.Interface(MULTIVAULT_ABI);
      const data = iface.encodeFunctionData('redeemAtom', [shares, receiverAddress, atomId]);

      return {
        to: MULTIVAULT_ADDRESS,
        data,
        atomId,
      };
    } catch (error) {
      console.error('Error preparing unstake transaction:', error);
      return null;
    }
  }

  async getAtomCost(): Promise<string> {
    try {
      const cost = await this.multivault.getAtomCost();
      return ethers.formatEther(cost);
    } catch (error) {
      console.error('Error getting atom cost:', error);
      return '0.0001';
    }
  }

  generateAgentManifest(agent: AgentIdentity): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareAgent',
      '@id': `tns:agent:${agent.domain}`,
      name: agent.domain,
      identifier: agent.address,
      agentType: agent.agentType,
      capabilities: agent.capabilities,
      url: agent.endpoint,
      mcpEndpoint: agent.mcpEndpoint,
      version: agent.version,
      dateCreated: new Date(agent.registeredAt).toISOString(),
      dateModified: agent.lastSeen ? new Date(agent.lastSeen).toISOString() : undefined,
      potentialAction: agent.capabilities.map(cap => ({
        '@type': 'Action',
        name: cap,
      })),
      interactionStatistic: agent.reputation ? {
        '@type': 'InteractionCounter',
        interactionType: 'Stake',
        userInteractionCount: agent.reputation.stakeholders,
      } : undefined,
    };
  }
}

export const agentService = new AgentService();
