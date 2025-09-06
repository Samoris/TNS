import { 
  type User, 
  type InsertUser, 
  type Domain, 
  type InsertDomain,
  type DomainRecord,
  type InsertDomainRecord,
  type DomainCommit,
  type InsertDomainCommit,
  type Subdomain,
  type InsertSubdomain,
  type DomainWithRecords,
  PRICING_TIERS
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Domains
  getDomain(id: string): Promise<Domain | undefined>;
  getDomainByName(name: string): Promise<Domain | undefined>;
  getDomainWithRecords(name: string): Promise<DomainWithRecords | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;
  updateDomain(id: string, updates: Partial<Domain>): Promise<Domain | undefined>;
  getDomainsByOwner(owner: string): Promise<Domain[]>;
  searchDomains(query: string): Promise<Domain[]>;

  // Domain Records
  getDomainRecords(domainId: string): Promise<DomainRecord[]>;
  createDomainRecord(record: InsertDomainRecord): Promise<DomainRecord>;
  updateDomainRecord(id: string, updates: Partial<DomainRecord>): Promise<DomainRecord | undefined>;
  deleteDomainRecord(id: string): Promise<boolean>;

  // Domain Commits (for commit-reveal registration)
  createDomainCommit(commit: InsertDomainCommit): Promise<DomainCommit>;
  getDomainCommit(commitment: string): Promise<DomainCommit | undefined>;
  revealDomainCommit(commitment: string): Promise<DomainCommit | undefined>;

  // Subdomains
  getSubdomains(parentDomainId: string): Promise<Subdomain[]>;
  createSubdomain(subdomain: InsertSubdomain): Promise<Subdomain>;
  updateSubdomain(id: string, updates: Partial<Subdomain>): Promise<Subdomain | undefined>;

  // Utility methods
  isDomainAvailable(name: string): Promise<boolean>;
  calculateDomainPrice(name: string): { pricePerYear: string; tier: string };
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private domains: Map<string, Domain>;
  private domainRecords: Map<string, DomainRecord>;
  private domainCommits: Map<string, DomainCommit>;
  private subdomains: Map<string, Subdomain>;

  constructor() {
    this.users = new Map();
    this.domains = new Map();
    this.domainRecords = new Map();
    this.domainCommits = new Map();
    this.subdomains = new Map();
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

  async getDomainWithRecords(name: string): Promise<DomainWithRecords | undefined> {
    const domain = await this.getDomainByName(name);
    if (!domain) return undefined;

    const records = await this.getDomainRecords(domain.id);
    const subdomains = await this.getSubdomains(domain.id);

    return {
      ...domain,
      records,
      subdomains,
    };
  }

  async createDomain(insertDomain: InsertDomain): Promise<Domain> {
    const id = randomUUID();
    const domain: Domain = {
      ...insertDomain,
      id,
      registrationDate: new Date(),
      isActive: true,
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

  // Subdomains
  async getSubdomains(parentDomainId: string): Promise<Subdomain[]> {
    return Array.from(this.subdomains.values()).filter(
      (subdomain) => subdomain.parentDomainId === parentDomainId
    );
  }

  async createSubdomain(insertSubdomain: InsertSubdomain): Promise<Subdomain> {
    const id = randomUUID();
    const subdomain: Subdomain = {
      ...insertSubdomain,
      id,
      createdAt: new Date(),
      isActive: true,
      resolver: insertSubdomain.resolver ?? null,
    };
    this.subdomains.set(id, subdomain);
    return subdomain;
  }

  async updateSubdomain(id: string, updates: Partial<Subdomain>): Promise<Subdomain | undefined> {
    const subdomain = this.subdomains.get(id);
    if (!subdomain) return undefined;

    const updatedSubdomain = { ...subdomain, ...updates };
    this.subdomains.set(id, updatedSubdomain);
    return updatedSubdomain;
  }

  // Utility methods
  async isDomainAvailable(name: string): Promise<boolean> {
    const domain = await this.getDomainByName(name);
    // Domain is available if it doesn't exist or if it's expired (regardless of isActive status)
    return !domain || domain.expirationDate < new Date();
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
}

export const storage = new MemStorage();
