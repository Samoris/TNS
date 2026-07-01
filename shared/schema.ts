import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const domains = pgTable("domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "alice.trust"
  owner: text("owner").notNull(), // wallet address
  registrant: text("registrant").notNull(), // who registered it
  resolver: text("resolver"), // resolver contract address
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  expirationDate: timestamp("expiration_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false), // primary domain for the owner
  tokenId: text("token_id"), // NFT token ID
  pricePerYear: decimal("price_per_year", { precision: 18, scale: 8 }).notNull(),
  txHash: text("tx_hash"), // blockchain transaction hash
});

export const domainRecords = pgTable("domain_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainId: text("domain_id").notNull().references(() => domains.id),
  recordType: text("record_type").notNull(), // "address", "content", "text"
  key: text("key").notNull(), // "ETH", "BTC", "url", "ipfs", etc.
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const domainCommits = pgTable("domain_commits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commitment: text("commitment").notNull().unique(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  duration: integer("duration").notNull(), // years
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revealedAt: timestamp("revealed_at"),
  isRevealed: boolean("is_revealed").notNull().default(false),
});

// Knowledge Graph sync status for domains
export const domainSyncStatus = pgTable("domain_sync_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainName: text("domain_name").notNull().unique(),
  atomId: text("atom_id"), // Intuition atom ID once synced
  atomUri: text("atom_uri").notNull(),
  syncStatus: text("sync_status").notNull().default("pending"), // pending, synced, failed
  syncedAt: timestamp("synced_at"),
  txHash: text("tx_hash"),
  errorMessage: text("error_message"),
});

// AI Agent registrations
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull().unique(),
  address: text("address").notNull(),
  publicKey: text("public_key"),
  agentType: text("agent_type").notNull(),
  capabilities: text("capabilities").array().notNull(),
  endpoint: text("endpoint"),
  mcpEndpoint: text("mcp_endpoint"),
  version: text("version").notNull().default("1.0.0"),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
  lastSeen: timestamp("last_seen"),
  reputationScore: decimal("reputation_score", { precision: 10, scale: 2 }),
  reputationTier: text("reputation_tier"),
  totalStaked: text("total_staked"),
  stakeholders: integer("stakeholders"),
  // Endpoint verification: proven control of declared endpoint via well-known token
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  // Live health status: 'online' | 'offline' | 'unknown'
  healthStatus: text("health_status").notNull().default("unknown"),
  lastHealthCheckAt: timestamp("last_health_check_at"),
});

// Agent-to-agent messages (durable inbox + history)
export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromDomain: text("from_domain").notNull(),
  toDomain: text("to_domain").notNull(),
  type: text("type").notNull(),
  method: text("method"),
  payload: text("payload").notNull(),
  signature: text("signature").notNull(),
  nonce: text("nonce").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  delivered: boolean("delivered").notNull().default(false),
}, (table) => ({
  // Replay protection: a given sender can only ever use a nonce once.
  uniqueSenderNonce: unique("agent_messages_from_nonce_unique").on(table.fromDomain, table.nonce),
}));

// Referral codes - one per wallet
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  totalPoints: integer("total_points").notNull().default(0),
  totalReferrals: integer("total_referrals").notNull().default(0),
});

// Individual referral events (one row per credited registration)
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerCode: text("referrer_code").notNull(),
  referrerAddress: text("referrer_address").notNull(),
  refereeAddress: text("referee_address").notNull(),
  domainName: text("domain_name").notNull().unique(),
  pointsAwarded: integer("points_awarded").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDomainSchema = createInsertSchema(domains).omit({
  id: true,
  registrationDate: true,
  isActive: true,
});

export const insertDomainRecordSchema = createInsertSchema(domainRecords).omit({
  id: true,
  updatedAt: true,
});

export const insertDomainCommitSchema = createInsertSchema(domainCommits).omit({
  id: true,
  createdAt: true,
  revealedAt: true,
  isRevealed: true,
});

export const insertDomainSyncStatusSchema = createInsertSchema(domainSyncStatus).omit({
  id: true,
  syncedAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  registeredAt: true,
  lastSeen: true,
  verified: true,
  verifiedAt: true,
  healthStatus: true,
  lastHealthCheckAt: true,
});

// Domain search and availability schema
export const domainSearchSchema = z.object({
  name: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
});

export const domainRegistrationSchema = z.object({
  name: z.string().min(3).max(63),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  duration: z.number().min(1).max(10), // years
  secret: z.string().min(32),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;

export type InsertDomainRecord = z.infer<typeof insertDomainRecordSchema>;
export type DomainRecord = typeof domainRecords.$inferSelect;

export type InsertDomainCommit = z.infer<typeof insertDomainCommitSchema>;
export type DomainCommit = typeof domainCommits.$inferSelect;

export type InsertDomainSyncStatus = z.infer<typeof insertDomainSyncStatusSchema>;
export type DomainSyncStatus = typeof domainSyncStatus.$inferSelect;

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({
  id: true,
  sentAt: true,
  delivered: true,
});
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentMessageRow = typeof agentMessages.$inferSelect;

export type ReferralCode = typeof referralCodes.$inferSelect;
export type Referral = typeof referrals.$inferSelect;

export const POINTS_PER_REFERRAL = 100;
export const POINTS_PER_NFT = 1000;

export type DomainSearch = z.infer<typeof domainSearchSchema>;
export type DomainRegistration = z.infer<typeof domainRegistrationSchema>;

// Domain with records (subdomains feature removed, kept for backwards compatibility)
export type DomainWithRecords = Domain & {
  records: DomainRecord[];
  subdomains: unknown[];
};

// Pricing tiers - Fixed TRUST pricing
export const PRICING_TIERS = {
  THREE_CHAR: { minLength: 3, maxLength: 3, pricePerYear: "100" },
  FOUR_CHAR: { minLength: 4, maxLength: 4, pricePerYear: "70" },
  FIVE_PLUS_CHAR: { minLength: 5, maxLength: Infinity, pricePerYear: "30" },
} as const;
