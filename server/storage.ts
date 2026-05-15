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
  type ReferralCode,
  type Referral,
  users,
  domains,
  domainRecords,
  domainCommits,
  domainSyncStatus,
  agents,
  referralCodes,
  referrals,
  PRICING_TIERS,
  POINTS_PER_REFERRAL,
  POINTS_PER_NFT,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, like, gte, desc, sql } from "drizzle-orm";

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

  // Referrals
  getOrCreateReferralCode(walletAddress: string): Promise<ReferralCode>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | undefined>;
  getReferralCodeByWallet(walletAddress: string): Promise<ReferralCode | undefined>;
  getReferralsByReferrer(walletAddress: string): Promise<Referral[]>;
  getReferralByDomain(domainName: string): Promise<Referral | undefined>;
  recordReferral(input: { referrerCode: string; referrerAddress: string; refereeAddress: string; domainName: string }): Promise<Referral>;
  getReferralLeaderboard(limit?: number): Promise<ReferralCode[]>;
  getReferralRank(walletAddress: string): Promise<{ rank: number; totalParticipants: number } | null>;
  getHolderStats(walletAddress: string): Promise<{ nftCount: number; holderPoints: number }>;
  getCombinedLeaderboard(limit?: number): Promise<Array<{
    walletAddress: string;
    code: string | null;
    totalPoints: number;
    referralPoints: number;
    holderPoints: number;
    totalReferrals: number;
    nftCount: number;
  }>>;
  getCombinedRank(walletAddress: string): Promise<{ rank: number; totalParticipants: number; totalPoints: number } | null>;
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

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 4);
}

// MemStorage stubs (not actively used; DatabaseStorage is the export)
MemStorage.prototype.getOrCreateReferralCode = async function () { throw new Error("MemStorage: referrals not implemented"); } as any;
MemStorage.prototype.getReferralCodeByCode = async function () { return undefined; } as any;
MemStorage.prototype.getReferralCodeByWallet = async function () { return undefined; } as any;
MemStorage.prototype.getReferralsByReferrer = async function () { return []; } as any;
MemStorage.prototype.getReferralByDomain = async function () { return undefined; } as any;
MemStorage.prototype.recordReferral = async function () { throw new Error("MemStorage: referrals not implemented"); } as any;
MemStorage.prototype.getReferralLeaderboard = async function () { return []; } as any;

// Referral methods on DatabaseStorage
DatabaseStorage.prototype.getReferralCodeByCode = async function (code: string): Promise<ReferralCode | undefined> {
  const [row] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
  return row;
};

DatabaseStorage.prototype.getReferralCodeByWallet = async function (walletAddress: string): Promise<ReferralCode | undefined> {
  const [row] = await db.select().from(referralCodes).where(eq(referralCodes.walletAddress, walletAddress.toLowerCase()));
  return row;
};

DatabaseStorage.prototype.getOrCreateReferralCode = async function (walletAddress: string): Promise<ReferralCode> {
  const lower = walletAddress.toLowerCase();
  const existing = await this.getReferralCodeByWallet(lower);
  if (existing) return existing;
  // Generate a unique code, retry on rare collision
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const collision = await this.getReferralCodeByCode(code);
    if (collision) continue;
    try {
      const [row] = await db.insert(referralCodes).values({ walletAddress: lower, code }).returning();
      return row;
    } catch (err) {
      // Race: another request created the row first; return it
      const again = await this.getReferralCodeByWallet(lower);
      if (again) return again;
    }
  }
  throw new Error("Failed to generate unique referral code");
};

DatabaseStorage.prototype.getReferralsByReferrer = async function (walletAddress: string): Promise<Referral[]> {
  return db.select().from(referrals).where(eq(referrals.referrerAddress, walletAddress.toLowerCase())).orderBy(desc(referrals.createdAt));
};

DatabaseStorage.prototype.getReferralByDomain = async function (domainName: string): Promise<Referral | undefined> {
  const [row] = await db.select().from(referrals).where(eq(referrals.domainName, domainName.toLowerCase()));
  return row;
};

DatabaseStorage.prototype.recordReferral = async function (input: { referrerCode: string; referrerAddress: string; refereeAddress: string; domainName: string }): Promise<Referral> {
  const referrerAddress = input.referrerAddress.toLowerCase();
  const refereeAddress = input.refereeAddress.toLowerCase();
  const domainName = input.domainName.toLowerCase();
  const [row] = await db.insert(referrals).values({
    referrerCode: input.referrerCode,
    referrerAddress,
    refereeAddress,
    domainName,
    pointsAwarded: POINTS_PER_REFERRAL,
  }).returning();
  await db.update(referralCodes)
    .set({
      totalPoints: sql`${referralCodes.totalPoints} + ${POINTS_PER_REFERRAL}`,
      totalReferrals: sql`${referralCodes.totalReferrals} + 1`,
    })
    .where(eq(referralCodes.walletAddress, referrerAddress));
  return row;
};

DatabaseStorage.prototype.getReferralLeaderboard = async function (limit: number = 10): Promise<ReferralCode[]> {
  return db.select().from(referralCodes).orderBy(desc(referralCodes.totalPoints)).limit(limit);
};

DatabaseStorage.prototype.getReferralRank = async function (walletAddress: string): Promise<{ rank: number; totalParticipants: number } | null> {
  const lower = walletAddress.toLowerCase();
  const me = await this.getReferralCodeByWallet(lower);
  if (!me) return null;
  // Rank = 1 + (number of users with strictly more points), giving ties the same best rank
  const higher = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(referralCodes)
    .where(sql`${referralCodes.totalPoints} > ${me.totalPoints}`);
  const total = await db.select({ c: sql<number>`count(*)::int` }).from(referralCodes);
  return {
    rank: (higher[0]?.c ?? 0) + 1,
    totalParticipants: total[0]?.c ?? 0,
  };
};

// ============= HOLDER POINTS (1000 per active .trust NFT held) =============

DatabaseStorage.prototype.getHolderStats = async function (walletAddress: string): Promise<{ nftCount: number; holderPoints: number }> {
  const lower = walletAddress.toLowerCase();
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(domains)
    .where(sql`lower(${domains.owner}) = ${lower} and ${domains.isActive} = true and ${domains.expirationDate} > now()`);
  const nftCount = row?.c ?? 0;
  return { nftCount, holderPoints: nftCount * POINTS_PER_NFT };
};

DatabaseStorage.prototype.getCombinedLeaderboard = async function (limit: number = 50): Promise<Array<{
  walletAddress: string;
  code: string | null;
  totalPoints: number;
  referralPoints: number;
  holderPoints: number;
  totalReferrals: number;
  nftCount: number;
}>> {
  const rows = await db.execute<{
    wallet_address: string;
    code: string | null;
    referral_points: number;
    total_referrals: number;
    nft_count: number;
  }>(sql`
    with holders as (
      select lower(${domains.owner}) as wallet_address, count(*)::int as nft_count
      from ${domains}
      where ${domains.isActive} = true and ${domains.expirationDate} > now()
      group by lower(${domains.owner})
    ),
    referrers as (
      select lower(${referralCodes.walletAddress}) as wallet_address,
             ${referralCodes.code} as code,
             ${referralCodes.totalPoints}::int as referral_points,
             ${referralCodes.totalReferrals}::int as total_referrals
      from ${referralCodes}
    ),
    combined as (
      select coalesce(h.wallet_address, r.wallet_address) as wallet_address,
             r.code,
             coalesce(r.referral_points, 0) as referral_points,
             coalesce(r.total_referrals, 0) as total_referrals,
             coalesce(h.nft_count, 0) as nft_count
      from holders h
      full outer join referrers r on h.wallet_address = r.wallet_address
    )
    select wallet_address, code, referral_points, total_referrals, nft_count
    from combined
    where (referral_points + nft_count * ${POINTS_PER_NFT}) > 0
    order by (referral_points + nft_count * ${POINTS_PER_NFT}) desc
    limit ${limit}
  `);

  return (rows.rows ?? rows as any).map((r: any) => {
    const holderPoints = (r.nft_count ?? 0) * POINTS_PER_NFT;
    return {
      walletAddress: r.wallet_address,
      code: r.code ?? null,
      referralPoints: r.referral_points ?? 0,
      holderPoints,
      totalPoints: (r.referral_points ?? 0) + holderPoints,
      totalReferrals: r.total_referrals ?? 0,
      nftCount: r.nft_count ?? 0,
    };
  });
};

DatabaseStorage.prototype.getCombinedRank = async function (walletAddress: string): Promise<{ rank: number; totalParticipants: number; totalPoints: number } | null> {
  const lower = walletAddress.toLowerCase();
  const result = await db.execute<{
    wallet_address: string;
    total_points: number;
    higher_count: number;
    total_participants: number;
  }>(sql`
    with holders as (
      select lower(${domains.owner}) as wallet_address, count(*)::int as nft_count
      from ${domains}
      where ${domains.isActive} = true and ${domains.expirationDate} > now()
      group by lower(${domains.owner})
    ),
    referrers as (
      select lower(${referralCodes.walletAddress}) as wallet_address,
             ${referralCodes.totalPoints}::int as referral_points
      from ${referralCodes}
    ),
    combined as (
      select coalesce(h.wallet_address, r.wallet_address) as wallet_address,
             coalesce(r.referral_points, 0) + coalesce(h.nft_count, 0) * ${POINTS_PER_NFT} as total_points
      from holders h
      full outer join referrers r on h.wallet_address = r.wallet_address
    ),
    scored as (
      select wallet_address, total_points from combined where total_points > 0
    ),
    me as (
      select total_points from scored where wallet_address = ${lower}
    )
    select
      ${lower} as wallet_address,
      (select total_points from me) as total_points,
      (select count(*)::int from scored where total_points > (select total_points from me)) as higher_count,
      (select count(*)::int from scored) as total_participants
  `);

  const row = (result.rows ?? result as any)[0];
  if (!row || row.total_points == null) return null;
  return {
    rank: (row.higher_count ?? 0) + 1,
    totalParticipants: row.total_participants ?? 0,
    totalPoints: row.total_points ?? 0,
  };
};

export const storage = new DatabaseStorage();
