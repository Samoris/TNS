import { 
  type User, 
  type InsertUser, 
  type Domain, 
  type InsertDomain,
  type DomainRecord,
  type InsertDomainRecord,
  type DomainCommit,
  type InsertDomainCommit,
  type DomainSyncStatus,
  type InsertDomainSyncStatus,
  type DomainWithRecords,
  type Agent,
  type InsertAgent,
  users,
  domains,
  domainRecords,
  domainCommits,
  domainSyncStatus,
  agents,
  PRICING_TIERS
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, like, gte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Domains
  getDomain(id: string): Promise<Domain | undefined>;
  getDomainByName(name: string): Promise<Domain | undefined>;
  getDomainByTokenId(tokenId: number): Promise<Domain | undefined>;
  getDomainWithRecords(name: string): Promise<DomainWithRecords | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;
  updateDomain(id: string, updates: Partial<Domain>): Promise<Domain | undefined>;
  getDomainsByOwner(owner: string): Promise<Domain[]>;
  searchDomains(query: string): Promise<Domain[]>;

  // Get all domains
  getAllDomains(): Promise<Domain[]>;

  // Domain Records
  getDomainRecords(domainId: string): Promise<DomainRecord[]>;
  createDomainRecord(record: InsertDomainRecord): Promise<DomainRecord>;
  updateDomainRecord(id: string, updates: Partial<DomainRecord>): Promise<DomainRecord | undefined>;
  deleteDomainRecord(id: string): Promise<boolean>;

  // Domain Commits (for commit-reveal registration)
  createDomainCommit(commit: InsertDomainCommit): Promise<DomainCommit>;
  getDomainCommit(commitment: string): Promise<DomainCommit | undefined>;
  revealDomainCommit(commitment: string): Promise<DomainCommit | undefined>;


  // Primary domain
  setPrimaryDomain(owner: string, domainName: string): Promise<void>;

  // Utility methods
  isDomainAvailable(name: string): Promise<boolean>;
  calculateDomainPrice(name: string): { pricePerYear: string; tier: string };

  // Domain Sync Status (Knowledge Graph)
  getDomainSyncStatus(domainName: string): Promise<DomainSyncStatus | undefined>;
  getAllSyncStatuses(): Promise<DomainSyncStatus[]>;
  createDomainSyncStatus(status: InsertDomainSyncStatus): Promise<DomainSyncStatus>;
  updateDomainSyncStatus(domainName: string, updates: Partial<DomainSyncStatus>): Promise<DomainSyncStatus | undefined>;
  getUnsyncedDomains(): Promise<DomainSyncStatus[]>;

  // Agents
  getAgent(domain: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  getAgentsByOwner(address: string): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(domain: string, updates: Partial<Agent>): Promise<Agent | undefined>;
  deleteAgent(domain: string): Promise<boolean>;
  discoverAgents(filters: { capability?: string; type?: string; minReputation?: number }): Promise<Agent[]>;

}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private domains: Map<string, Domain>;
  private domainRecords: Map<string, DomainRecord>;
  private domainCommits: Map<string, DomainCommit>;
  private domainSyncStatuses: Map<string, DomainSyncStatus>;
  private agents: Map<string, Agent>;

  constructor() {
    this.users = new Map();
    this.domains = new Map();
    this.domainRecords = new Map();
    this.domainCommits = new Map();
    this.domainSyncStatuses = new Map();
    this.agents = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Domains
  async getDomain(id: string): Promise<Domain | undefined> {
    return this.domains.get(id);
  }

  async getDomainByName(name: string): Promise<Domain | undefined> {
    const fullName = name.endsWith('.trust') ? name : `${name}.trust`;
    return Array.from(this.domains.values()).find(
      (domain) => domain.name === fullName
    );
  }

  async getDomainByTokenId(tokenId: number): Promise<Domain | undefined> {
    return Array.from(this.domains.values()).find(
      (domain) => domain.tokenId === tokenId.toString()
    );
  }

  async getDomainWithRecords(name: string): Promise<DomainWithRecords | undefined> {
    const domain = await this.getDomainByName(name);
    if (!domain) return undefined;

    const records = await this.getDomainRecords(domain.id);

    return {
      ...domain,
      records,
      subdomains: [],
    };
  }

  async createDomain(insertDomain: InsertDomain): Promise<Domain> {
    const id = randomUUID();
    const domain: Domain = {
      ...insertDomain,
      id,
      registrationDate: new Date(),
      isActive: true,
      isPrimary: false,
      resolver: insertDomain.resolver ?? null,
      tokenId: insertDomain.tokenId ?? null,
      txHash: insertDomain.txHash ?? null,
    };
    this.domains.set(id, domain);
    return domain;
  }

  async updateDomain(id: string, updates: Partial<Domain>): Promise<Domain | undefined> {
    const domain = this.domains.get(id);
    if (!domain) return undefined;

    const updatedDomain = { ...domain, ...updates };
    this.domains.set(id, updatedDomain);
    return updatedDomain;
  }

  async getDomainsByOwner(owner: string): Promise<Domain[]> {
    return Array.from(this.domains.values()).filter(
      (domain) => domain.owner === owner || domain.registrant === owner
    );
  }

  async searchDomains(query: string): Promise<Domain[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.domains.values()).filter(
      (domain) => domain.name.toLowerCase().includes(searchTerm)
    );
  }

  async getAllDomains(): Promise<Domain[]> {
    return Array.from(this.domains.values());
  }

  // Domain Records
  async getDomainRecords(domainId: string): Promise<DomainRecord[]> {
    return Array.from(this.domainRecords.values()).filter(
      (record) => record.domainId === domainId
    );
  }

  async createDomainRecord(insertRecord: InsertDomainRecord): Promise<DomainRecord> {
    const id = randomUUID();
    const record: DomainRecord = {
      ...insertRecord,
      id,
      updatedAt: new Date(),
    };
    this.domainRecords.set(id, record);
    return record;
  }

  async updateDomainRecord(id: string, updates: Partial<DomainRecord>): Promise<DomainRecord | undefined> {
    const record = this.domainRecords.get(id);
    if (!record) return undefined;

    const updatedRecord = { 
      ...record, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.domainRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  async deleteDomainRecord(id: string): Promise<boolean> {
    return this.domainRecords.delete(id);
  }

  // Domain Commits
  async createDomainCommit(insertCommit: InsertDomainCommit): Promise<DomainCommit> {
    const id = randomUUID();
    const commit: DomainCommit = {
      ...insertCommit,
      id,
      createdAt: new Date(),
      revealedAt: null,
      isRevealed: false,
    };
    this.domainCommits.set(commit.commitment, commit);
    return commit;
  }

  async getDomainCommit(commitment: string): Promise<DomainCommit | undefined> {
    return this.domainCommits.get(commitment);
  }

  async revealDomainCommit(commitment: string): Promise<DomainCommit | undefined> {
    const commit = this.domainCommits.get(commitment);
    if (!commit || commit.isRevealed) return undefined;

    const updatedCommit = {
      ...commit,
      revealedAt: new Date(),
      isRevealed: true,
    };
    this.domainCommits.set(commitment, updatedCommit);
    return updatedCommit;
  }

  // Utility methods
  async isDomainAvailable(name: string): Promise<boolean> {
    const domain = await this.getDomainByName(name);
    // Domain is available if it doesn't exist or if it's expired (regardless of isActive status)
    return !domain || domain.expirationDate < new Date();
  }

  // Primary domain
  async setPrimaryDomain(owner: string, domainName: string): Promise<void> {
    const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
    
    // First, unset all primary domains for this owner
    const ownerDomains = Array.from(this.domains.values()).filter(
      domain => domain.owner === owner && domain.isPrimary
    );
    for (const domain of ownerDomains) {
      await this.updateDomain(domain.id, { isPrimary: false });
    }
    
    // Then set the requested domain as primary
    const domain = await this.getDomainByName(fullName);
    if (domain) {
      await this.updateDomain(domain.id, { isPrimary: true });
    }
  }

  calculateDomainPrice(name: string): { pricePerYear: string; tier: string } {
    const cleanName = name.replace('.trust', '');
    const length = cleanName.length;

    if (length === 3) {
      return { pricePerYear: PRICING_TIERS.THREE_CHAR.pricePerYear, tier: "3 characters" };
    } else if (length === 4) {
      return { pricePerYear: PRICING_TIERS.FOUR_CHAR.pricePerYear, tier: "4 characters" };
    } else {
      return { pricePerYear: PRICING_TIERS.FIVE_PLUS_CHAR.pricePerYear, tier: "5+ characters" };
    }
  }

  // Domain Sync Status methods
  async getDomainSyncStatus(domainName: string): Promise<DomainSyncStatus | undefined> {
    const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
    return this.domainSyncStatuses.get(fullName);
  }

  async getAllSyncStatuses(): Promise<DomainSyncStatus[]> {
    return Array.from(this.domainSyncStatuses.values());
  }

  async createDomainSyncStatus(insertStatus: InsertDomainSyncStatus): Promise<DomainSyncStatus> {
    const id = randomUUID();
    const status: DomainSyncStatus = {
      id,
      domainName: insertStatus.domainName,
      atomUri: insertStatus.atomUri,
      syncStatus: insertStatus.syncStatus ?? 'pending',
      syncedAt: null,
      atomId: insertStatus.atomId ?? null,
      txHash: insertStatus.txHash ?? null,
      errorMessage: insertStatus.errorMessage ?? null,
    };
    this.domainSyncStatuses.set(status.domainName, status);
    return status;
  }

  async updateDomainSyncStatus(domainName: string, updates: Partial<DomainSyncStatus>): Promise<DomainSyncStatus | undefined> {
    const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
    const status = this.domainSyncStatuses.get(fullName);
    if (!status) return undefined;

    const updatedStatus = { ...status, ...updates };
    this.domainSyncStatuses.set(fullName, updatedStatus);
    return updatedStatus;
  }

  async getUnsyncedDomains(): Promise<DomainSyncStatus[]> {
    return Array.from(this.domainSyncStatuses.values()).filter(
      status => status.syncStatus === 'pending' || status.syncStatus === 'failed'
    );
  }

  // Agent methods
  async getAgent(domain: string): Promise<Agent | undefined> {
    const fullName = domain.endsWith('.trust') ? domain : `${domain}.trust`;
    return this.agents.get(fullName);
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgentsByOwner(address: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      agent => agent.address.toLowerCase() === address.toLowerCase()
    );
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const fullDomain = insertAgent.domain.endsWith('.trust') 
      ? insertAgent.domain 
      : `${insertAgent.domain}.trust`;
    
    const agent: Agent = {
      id,
      domain: fullDomain,
      address: insertAgent.address,
      publicKey: insertAgent.publicKey ?? null,
      agentType: insertAgent.agentType,
      capabilities: insertAgent.capabilities,
      endpoint: insertAgent.endpoint ?? null,
      mcpEndpoint: insertAgent.mcpEndpoint ?? null,
      version: insertAgent.version ?? '1.0.0',
      registeredAt: new Date(),
      lastSeen: null,
      reputationScore: insertAgent.reputationScore ?? null,
      reputationTier: insertAgent.reputationTier ?? null,
      totalStaked: insertAgent.totalStaked ?? null,
      stakeholders: insertAgent.stakeholders ?? null,
    };
    this.agents.set(fullDomain, agent);
    return agent;
  }

  async updateAgent(domain: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const fullName = domain.endsWith('.trust') ? domain : `${domain}.trust`;
    const agent = this.agents.get(fullName);
    if (!agent) return undefined;

    const updatedAgent = { ...agent, ...updates, lastSeen: new Date() };
    this.agents.set(fullName, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(domain: string): Promise<boolean> {
    const fullName = domain.endsWith('.trust') ? domain : `${domain}.trust`;
    return this.agents.delete(fullName);
  }

  async discoverAgents(filters: { capability?: string; type?: string; minReputation?: number }): Promise<Agent[]> {
    let agents = Array.from(this.agents.values());

    if (filters.capability) {
      agents = agents.filter(a => a.capabilities.includes(filters.capability!));
    }
    if (filters.type) {
      agents = agents.filter(a => a.agentType === filters.type);
    }
    if (filters.minReputation) {
      agents = agents.filter(a => 
        a.reputationScore !== null && 
        parseFloat(a.reputationScore) >= filters.minReputation!
      );
    }

    return agents;
  }

}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDomain(id: string): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id));
    return domain;
  }

  async getDomainByName(name: string): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.name, name));
    return domain;
  }

  async getDomainByTokenId(tokenId: number): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.tokenId, tokenId.toString()));
    return domain;
  }

  async getDomainWithRecords(name: string): Promise<DomainWithRecords | undefined> {
    const domain = await this.getDomainByName(name);
    if (!domain) return undefined;
    
    const records = await this.getDomainRecords(domain.id);
    return { ...domain, records, subdomains: [] };
  }

  async createDomain(insertDomain: InsertDomain): Promise<Domain> {
    const [domain] = await db.insert(domains).values(insertDomain).returning();
    return domain;
  }

  async updateDomain(id: string, updates: Partial<Domain>): Promise<Domain | undefined> {
    const [domain] = await db.update(domains).set(updates).where(eq(domains.id, id)).returning();
    return domain;
  }

  async getDomainsByOwner(owner: string): Promise<Domain[]> {
    return db.select().from(domains).where(eq(domains.owner, owner));
  }

  async searchDomains(query: string): Promise<Domain[]> {
    return db.select().from(domains).where(like(domains.name, `%${query}%`));
  }

  async getAllDomains(): Promise<Domain[]> {
    return db.select().from(domains);
  }

  async getDomainRecords(domainId: string): Promise<DomainRecord[]> {
    return db.select().from(domainRecords).where(eq(domainRecords.domainId, domainId));
  }

  async createDomainRecord(record: InsertDomainRecord): Promise<DomainRecord> {
    const [result] = await db.insert(domainRecords).values(record).returning();
    return result;
  }

  async updateDomainRecord(id: string, updates: Partial<DomainRecord>): Promise<DomainRecord | undefined> {
    const [result] = await db.update(domainRecords).set({ ...updates, updatedAt: new Date() }).where(eq(domainRecords.id, id)).returning();
    return result;
  }

  async deleteDomainRecord(id: string): Promise<boolean> {
    const result = await db.delete(domainRecords).where(eq(domainRecords.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createDomainCommit(commit: InsertDomainCommit): Promise<DomainCommit> {
    const [result] = await db.insert(domainCommits).values(commit).returning();
    return result;
  }

  async getDomainCommit(commitment: string): Promise<DomainCommit | undefined> {
    const [result] = await db.select().from(domainCommits).where(eq(domainCommits.commitment, commitment));
    return result;
  }

  async revealDomainCommit(commitment: string): Promise<DomainCommit | undefined> {
    const [result] = await db.update(domainCommits)
      .set({ isRevealed: true, revealedAt: new Date() })
      .where(eq(domainCommits.commitment, commitment))
      .returning();
    return result;
  }

  async setPrimaryDomain(owner: string, domainName: string): Promise<void> {
    await db.update(domains).set({ isPrimary: false }).where(eq(domains.owner, owner));
    await db.update(domains).set({ isPrimary: true }).where(eq(domains.name, domainName));
  }

  async isDomainAvailable(name: string): Promise<boolean> {
    const domain = await this.getDomainByName(name);
    return !domain;
  }

  calculateDomainPrice(name: string): { pricePerYear: string; tier: string } {
    const length = name.length;
    if (length === 3) {
      return { pricePerYear: PRICING_TIERS.THREE_CHAR.pricePerYear, tier: "3 characters" };
    } else if (length === 4) {
      return { pricePerYear: PRICING_TIERS.FOUR_CHAR.pricePerYear, tier: "4 characters" };
    } else {
      return { pricePerYear: PRICING_TIERS.FIVE_PLUS_CHAR.pricePerYear, tier: "5+ characters" };
    }
  }

  async getDomainSyncStatus(domainName: string): Promise<DomainSyncStatus | undefined> {
    const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
    const [result] = await db.select().from(domainSyncStatus).where(eq(domainSyncStatus.domainName, fullName));
    return result;
  }

  async getAllSyncStatuses(): Promise<DomainSyncStatus[]> {
    return db.select().from(domainSyncStatus);
  }

  async createDomainSyncStatus(insertStatus: InsertDomainSyncStatus): Promise<DomainSyncStatus> {
    const [result] = await db.insert(domainSyncStatus).values(insertStatus).returning();
    return result;
  }

  async updateDomainSyncStatus(domainName: string, updates: Partial<DomainSyncStatus>): Promise<DomainSyncStatus | undefined> {
    const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
    const [result] = await db.update(domainSyncStatus).set(updates).where(eq(domainSyncStatus.domainName, fullName)).returning();
    return result;
  }

  async getUnsyncedDomains(): Promise<DomainSyncStatus[]> {
    return db.select().from(domainSyncStatus).where(
      eq(domainSyncStatus.syncStatus, 'pending')
    );
  }

  async getAgent(domain: string): Promise<Agent | undefined> {
    const fullName = domain.endsWith('.trust') ? domain : `${domain}.trust`;
    const [result] = await db.select().from(agents).where(eq(agents.domain, fullName));
    return result;
  }

  async getAllAgents(): Promise<Agent[]> {
    return db.select().from(agents);
  }

  async getAgentsByOwner(address: string): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.address, address));
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const fullDomain = insertAgent.domain.endsWith('.trust') 
      ? insertAgent.domain 
      : `${insertAgent.domain}.trust`;
    const [result] = await db.insert(agents).values({ ...insertAgent, domain: fullDomain }).returning();
    return result;
  }

  async updateAgent(domain: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const fullName = domain.endsWith('.trust') ? domain : `${domain}.trust`;
    const [result] = await db.update(agents).set({ ...updates, lastSeen: new Date() }).where(eq(agents.domain, fullName)).returning();
    return result;
  }

  async deleteAgent(domain: string): Promise<boolean> {
    const fullName = domain.endsWith('.trust') ? domain : `${domain}.trust`;
    const result = await db.delete(agents).where(eq(agents.domain, fullName));
    return (result.rowCount ?? 0) > 0;
  }

  async discoverAgents(filters: { capability?: string; type?: string; minReputation?: number }): Promise<Agent[]> {
    let results = await db.select().from(agents);
    
    if (filters.capability) {
      results = results.filter(a => a.capabilities.includes(filters.capability!));
    }
    if (filters.type) {
      results = results.filter(a => a.agentType === filters.type);
    }
    if (filters.minReputation) {
      results = results.filter(a => 
        a.reputationScore !== null && 
        parseFloat(a.reputationScore) >= filters.minReputation!
      );
    }
    
    return results;
  }

}

export const storage = new DatabaseStorage();
