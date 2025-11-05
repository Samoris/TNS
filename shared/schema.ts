import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, integer } from "drizzle-orm/pg-core";
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


export type DomainSearch = z.infer<typeof domainSearchSchema>;
export type DomainRegistration = z.infer<typeof domainRegistrationSchema>;

// Domain with records
export type DomainWithRecords = Domain & {
  records: DomainRecord[];
  subdomains: never[];
};

// Pricing tiers - Fixed TRUST pricing
export const PRICING_TIERS = {
  THREE_CHAR: { minLength: 3, maxLength: 3, pricePerYear: "100" },
  FOUR_CHAR: { minLength: 4, maxLength: 4, pricePerYear: "70" },
  FIVE_PLUS_CHAR: { minLength: 5, maxLength: Infinity, pricePerYear: "30" },
} as const;
