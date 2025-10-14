import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  domainSearchSchema, 
  domainRegistrationSchema, 
  insertDomainSchema,
  insertDomainRecordSchema,
  insertDomainCommitSchema,
  insertSubdomainSchema
} from "@shared/schema";
import { z } from "zod";
import { createHash } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Domain search and availability
  app.get("/api/domains/search/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const parsedName = domainSearchSchema.parse({ name });
      
      // Check both backend storage AND blockchain availability
      const backendAvailable = await storage.isDomainAvailable(parsedName.name);
      
      // Note: For now we'll use backend availability, but in a production system
      // you would also check the blockchain using web3 calls
      // const blockchainAvailable = await checkBlockchainAvailability(parsedName.name);
      // const isAvailable = backendAvailable && blockchainAvailable;
      
      const isAvailable = backendAvailable;
      const pricing = storage.calculateDomainPrice(parsedName.name);
      
      const fullName = `${parsedName.name}.trust`;
      
      res.json({
        name: fullName,
        available: isAvailable,
        pricing,
        suggestions: isAvailable ? [] : await generateSuggestions(parsedName.name),
      });
    } catch (error) {
      res.status(400).json({ 
        message: error instanceof z.ZodError ? error.errors[0].message : "Invalid domain name" 
      });
    }
  });

  // Get domain details
  app.get("/api/domains/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const domain = await storage.getDomainWithRecords(name);
      
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      res.json(domain);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain details" });
    }
  });

  // Get domains by owner
  app.get("/api/domains/owner/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Invalid Ethereum address" });
      }
      
      const domains = await storage.getDomainsByOwner(address);
      const domainsWithRecords = await Promise.all(
        domains.map(async (domain) => {
          const records = await storage.getDomainRecords(domain.id);
          const subdomains = await storage.getSubdomains(domain.id);
          return { ...domain, records, subdomains };
        })
      );
      
      res.json(domainsWithRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });

  // Commit phase of domain registration
  app.post("/api/domains/commit", async (req, res) => {
    try {
      const { commitment, name, owner, duration, secret } = req.body;
      
      // Validate input
      if (!commitment || !name || !owner || !duration || !secret) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if domain is available
      const isAvailable = await storage.isDomainAvailable(name);
      if (!isAvailable) {
        return res.status(400).json({ message: "Domain not available" });
      }
      
      // Check if commitment already exists
      const existingCommit = await storage.getDomainCommit(commitment);
      if (existingCommit) {
        return res.status(400).json({ message: "Commitment already exists" });
      }
      
      const commit = await storage.createDomainCommit({
        commitment,
        name,
        owner,
        duration,
        secret,
      });
      
      res.json({ 
        message: "Commitment created successfully", 
        commitId: commit.id,
        revealAfter: new Date(Date.now() + 60000), // 1 minute delay
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create commitment" });
    }
  });

  // Direct domain registration (simplified)
  app.post("/api/domains/register", async (req, res) => {
    try {
      const { name, owner, duration, txHash } = req.body;
      
      console.log("Registration request:", { name, owner, duration, txHash });
      
      // Validate input
      if (!name || !owner || !duration || !txHash) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate transaction hash format
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return res.status(400).json({ message: "Invalid transaction hash format" });
      }
      
      // Validate and normalize domain name
      const normalizedName = name.toLowerCase().replace(/\.trust$/, '');
      if (normalizedName.length < 3 || normalizedName.length > 63) {
        return res.status(400).json({ message: "Domain name must be 3-63 characters" });
      }
      if (!/^[a-z0-9-]+$/.test(normalizedName)) {
        return res.status(400).json({ message: "Invalid domain name format" });
      }
      
      // Validate owner address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
        return res.status(400).json({ message: "Invalid owner address format" });
      }
      
      // Re-check domain availability to prevent race conditions
      const isAvailable = await storage.isDomainAvailable(normalizedName);
      if (!isAvailable) {
        return res.status(400).json({ message: "Domain not available" });
      }
      
      // Calculate pricing and expiration using normalized name
      const pricing = storage.calculateDomainPrice(normalizedName);
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + duration);
      
      // Create domain with normalized name and real transaction hash
      const domain = await storage.createDomain({
        name: `${normalizedName}.trust`,
        owner,
        registrant: owner,
        resolver: null,
        expirationDate,
        tokenId: `tns_${Date.now()}`,
        pricePerYear: pricing.pricePerYear,
        txHash: txHash, // Store the real blockchain transaction hash
      });
      
      res.json({ 
        message: "Domain registered successfully", 
        domain,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register domain" });
    }
  });

  // Reveal phase of domain registration
  app.post("/api/domains/reveal", async (req, res) => {
    try {
      const { commitment, name, owner, duration, secret, txHash } = req.body;
      
      console.log("Reveal request data:", { commitment, name, owner, duration, secret });
      
      // Get commitment
      const commit = await storage.getDomainCommit(commitment);
      console.log("Found commitment:", commit);
      
      if (!commit) {
        return res.status(400).json({ message: "Commitment not found" });
      }
      
      if (commit.isRevealed) {
        return res.status(400).json({ message: "Commitment already revealed" });
      }
      
      // Check timing (must wait at least 1 minute)
      const minRevealTime = new Date(commit.createdAt.getTime() + 60000);
      if (new Date() < minRevealTime) {
        return res.status(400).json({ 
          message: "Must wait at least 1 minute before revealing",
          revealAfter: minRevealTime,
        });
      }
      
      // Verify commitment matches
      const expectedCommitment = createHash('sha256')
        .update(`${name}${owner}${duration}${secret}`)
        .digest('hex');
      
      if (commitment !== expectedCommitment) {
        return res.status(400).json({ message: "Invalid commitment data" });
      }
      
      // Check domain is still available
      const isAvailable = await storage.isDomainAvailable(name);
      if (!isAvailable) {
        return res.status(400).json({ message: "Domain no longer available" });
      }
      
      // Calculate pricing and expiration
      const pricing = storage.calculateDomainPrice(name);
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + duration);
      
      // Create domain
      const domain = await storage.createDomain({
        name: name.endsWith('.trust') ? name : `${name}.trust`,
        owner,
        registrant: owner,
        resolver: null,
        expirationDate,
        tokenId: `tns_${Date.now()}`,
        pricePerYear: pricing.pricePerYear,
        txHash: txHash || null, // Store transaction hash if provided
      });
      
      // Mark commitment as revealed
      await storage.revealDomainCommit(commitment);
      
      res.json({ 
        message: "Domain registered successfully", 
        domain,
        totalCost: (parseFloat(pricing.pricePerYear) * duration).toString(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to register domain" });
    }
  });

  // Update domain records
  app.post("/api/domains/:name/records", async (req, res) => {
    try {
      const { name } = req.params;
      const { recordType, key, value, owner } = req.body;
      
      const domain = await storage.getDomainByName(name);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      // Check ownership
      if (domain.owner !== owner) {
        return res.status(403).json({ message: "Not domain owner" });
      }
      
      const record = await storage.createDomainRecord({
        domainId: domain.id,
        recordType,
        key,
        value,
      });
      
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to create record" });
    }
  });

  // Update domain record
  app.put("/api/domains/:name/records/:recordId", async (req, res) => {
    try {
      const { name, recordId } = req.params;
      const { value, owner } = req.body;
      
      const domain = await storage.getDomainByName(name);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      // Check ownership
      if (domain.owner !== owner) {
        return res.status(403).json({ message: "Not domain owner" });
      }
      
      const record = await storage.updateDomainRecord(recordId, { value });
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to update record" });
    }
  });

  // Create subdomain
  app.post("/api/domains/:name/subdomains", async (req, res) => {
    try {
      const { name } = req.params;
      const { subdomain, owner: requestOwner, targetOwner } = req.body;
      
      const parentDomain = await storage.getDomainByName(name);
      if (!parentDomain) {
        return res.status(404).json({ message: "Parent domain not found" });
      }
      
      // Check ownership
      if (parentDomain.owner !== requestOwner) {
        return res.status(403).json({ message: "Not domain owner" });
      }
      
      const subdomainName = `${subdomain}.${parentDomain.name}`;
      
      const newSubdomain = await storage.createSubdomain({
        name: subdomainName,
        parentDomainId: parentDomain.id,
        owner: targetOwner || requestOwner,
        resolver: null,
      });
      
      res.json(newSubdomain);
    } catch (error) {
      res.status(500).json({ message: "Failed to create subdomain" });
    }
  });

  // Set primary domain
  // NOTE: This endpoint trusts the owner field from the request body.
  // In production, this should be replaced with signature verification or session-based auth.
  // This pattern is used across all write endpoints for simplicity in this demo.
  app.post("/api/domains/:name/set-primary", async (req, res) => {
    try {
      const { name } = req.params;
      const { owner } = req.body;
      
      const domain = await storage.getDomainByName(name);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      
      // Check ownership
      if (domain.owner !== owner) {
        return res.status(403).json({ message: "Not domain owner" });
      }
      
      // Set this domain as primary
      await storage.setPrimaryDomain(owner, name);
      
      res.json({ message: "Primary domain set successfully", domain: name });
    } catch (error) {
      res.status(500).json({ message: "Failed to set primary domain" });
    }
  });

  // Network information
  app.get("/api/network", (req, res) => {
    res.json({
      chainId: 13579,
      networkName: "Intuition testnet",
      rpcUrl: "https://testnet.rpc.intuition.systems",
      currencySymbol: "TRUST",
      explorerUrl: "https://testnet.explorer.intuition.systems",
    });
  });

  // Pricing information - USD-based pricing structure (at $0.10 per TRUST)
  app.get("/api/pricing", (req, res) => {
    res.json({
      tiers: [
        { characters: "5+", pricePerYear: "50", priceUsd: "5.00", description: "5+ characters" },
        { characters: "4", pricePerYear: "300", priceUsd: "30.00", description: "4 characters" },
        { characters: "3", pricePerYear: "500", priceUsd: "50.00", description: "3 characters" },
      ],
      currency: "TRUST",
      displayCurrency: "USD",
      trustPriceUsd: "0.10",
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate domain suggestions
async function generateSuggestions(name: string): Promise<string[]> {
  const suggestions = [
    `${name}app`,
    `${name}dao`,
    `${name}web3`,
    `my${name}`,
    `the${name}`,
    `${name}official`,
  ];
  
  const available = [];
  for (const suggestion of suggestions) {
    const isAvailable = await storage.isDomainAvailable(suggestion);
    if (isAvailable) {
      available.push(`${suggestion}.trust`);
    }
  }
  
  return available.slice(0, 3);
}
