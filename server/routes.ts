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

  // Get subdomains for a domain
  app.get("/api/domains/:name/subdomains", async (req, res) => {
    try {
      const { name } = req.params;
      
      let parentDomain = await storage.getDomainByName(name);
      
      // If domain doesn't exist in storage (blockchain-only domain), return empty array
      // We don't create a placeholder here to avoid unnecessary writes on GET requests
      if (!parentDomain) {
        return res.json([]);
      }
      
      const subdomains = await storage.getSubdomains(parentDomain.id);
      res.json(subdomains);
    } catch (error) {
      console.error("Error fetching subdomains:", error);
      res.status(500).json({ message: "Failed to fetch subdomains" });
    }
  });

  // Create subdomain
  app.post("/api/domains/:name/subdomains", async (req, res) => {
    try {
      const { name } = req.params;
      const { subdomain, owner: requestOwner, targetOwner } = req.body;
      
      // Try to get domain from storage first
      let parentDomain = await storage.getDomainByName(name);
      
      // If not in storage, create a placeholder domain entry for subdomain tracking
      // This allows subdomains to work with blockchain-only domains
      if (!parentDomain) {
        // Calculate price based on domain length
        const domainLength = name.replace('.trust', '').length;
        let pricePerYear = "30"; // 5+ chars default
        if (domainLength === 3) pricePerYear = "100";
        else if (domainLength === 4) pricePerYear = "70";
        
        parentDomain = await storage.createDomain({
          name,
          owner: requestOwner,
          registrant: requestOwner,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          pricePerYear,
          resolver: null,
          tokenId: null,
          txHash: null,
        });
      }
      
      // Verify ownership (trust the requestOwner for now since domains are on-chain)
      // In production, this should verify on-chain ownership
      
      const subdomainName = `${subdomain}.${name}`;
      
      const newSubdomain = await storage.createSubdomain({
        name: subdomainName,
        parentDomainId: parentDomain.id,
        owner: targetOwner || requestOwner,
        resolver: null,
      });
      
      res.json(newSubdomain);
    } catch (error) {
      console.error("Error creating subdomain:", error);
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
      chainId: 1155,
      networkName: "Intuition mainnet",
      rpcUrl: "https://intuition.calderachain.xyz",
      currencySymbol: "TRUST",
      explorerUrl: "https://explorer.intuition.systems",
      contractAddress: "0x7C365AF9034b00dadc616dE7f38221C678D423Fa",
    });
  });

  // Pricing information - Fixed TRUST pricing
  app.get("/api/pricing", (req, res) => {
    res.json({
      tiers: [
        { characters: "5+", pricePerYear: "30", description: "5+ characters" },
        { characters: "4", pricePerYear: "70", description: "4 characters" },
        { characters: "3", pricePerYear: "100", description: "3 characters" },
      ],
      currency: "TRUST",
    });
  });

  // NFT Metadata endpoint - ERC-721 compliant
  app.get("/api/metadata/:tokenId", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.tokenId);
      
      if (isNaN(tokenId) || tokenId < 1) {
        return res.status(400).json({ message: "Invalid token ID" });
      }

      // Get domain info from blockchain (not storage)
      const { blockchainService } = await import("./blockchain");
      const domain = await blockchainService.getDomainByTokenId(tokenId);
      
      if (!domain) {
        return res.status(404).json({ message: "Token not found" });
      }

      const domainName = `${domain.name}.trust`;
      const length = domain.name.length;
      
      // Determine pricing tier
      let pricingTier: string;
      let pricePerYear: string;
      if (length === 3) {
        pricingTier = "Premium (3 characters)";
        pricePerYear = "100 TRUST/year";
      } else if (length === 4) {
        pricingTier = "Standard (4 characters)";
        pricePerYear = "70 TRUST/year";
      } else {
        pricingTier = "Basic (5+ characters)";
        pricePerYear = "30 TRUST/year";
      }

      // Determine character set
      const characterSet = /^[a-zA-Z]+$/.test(domain.name) 
        ? "letters" 
        : /^[0-9]+$/.test(domain.name)
        ? "numbers"
        : "mixed";

      // Build ERC-721 compliant metadata
      const metadata = {
        name: domainName,
        description: `${domainName}, a Trust Name Service domain on Intuition mainnet. This NFT represents ownership of the domain name.`,
        image: `${req.protocol}://${req.get("host")}/api/metadata/${tokenId}/image`,
        external_url: `${req.protocol}://${req.get("host")}/manage/${domain.name}`,
        attributes: [
          {
            trait_type: "Domain Length",
            display_type: "number",
            value: length
          },
          {
            trait_type: "Character Set",
            value: characterSet
          },
          {
            trait_type: "Pricing Tier",
            value: pricingTier
          },
          {
            trait_type: "Price Per Year",
            value: pricePerYear
          },
          {
            trait_type: "Expiration Date",
            display_type: "date",
            value: Math.floor(domain.expirationTime.getTime() / 1000)
          },
          {
            trait_type: "Token ID",
            display_type: "number",
            value: tokenId
          }
        ]
      };

      res.json(metadata);
    } catch (error) {
      console.error("Metadata error:", error);
      res.status(500).json({ message: "Failed to generate metadata" });
    }
  });

  // NFT Image endpoint - Dynamic SVG generation
  app.get("/api/metadata/:tokenId/image", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.tokenId);
      
      if (isNaN(tokenId) || tokenId < 1) {
        return res.status(400).json({ message: "Invalid token ID" });
      }

      // Get domain info from blockchain (not storage)
      const { blockchainService } = await import("./blockchain");
      const domain = await blockchainService.getDomainByTokenId(tokenId);
      
      if (!domain) {
        return res.status(404).json({ message: "Token not found" });
      }

      const domainName = `${domain.name}.trust`;
      const length = domain.name.length;
      
      // Determine color based on pricing tier
      let gradientColors: { start: string; end: string };
      if (length === 3) {
        // Premium - Gold gradient
        gradientColors = { start: "#FFD700", end: "#FFA500" };
      } else if (length === 4) {
        // Standard - Blue gradient
        gradientColors = { start: "#4A90E2", end: "#357ABD" };
      } else {
        // Basic - Purple gradient
        gradientColors = { start: "#9B59B6", end: "#8E44AD" };
      }

      // Generate SVG
      const svg = generateDomainSVG(domainName, gradientColors, tokenId);

      res.setHeader("Content-Type", "image/svg+xml");
      res.send(svg);
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).send("Failed to generate image");
    }
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

// Helper function to generate SVG image for domain NFT
function generateDomainSVG(
  domainName: string, 
  gradientColors: { start: string; end: string },
  tokenId: number
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradientColors.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradientColors.end};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="500" fill="url(#bgGradient)"/>
  
  <!-- Decorative circles -->
  <circle cx="50" cy="50" r="30" fill="white" opacity="0.1"/>
  <circle cx="450" cy="450" r="40" fill="white" opacity="0.1"/>
  <circle cx="100" cy="400" r="20" fill="white" opacity="0.1"/>
  <circle cx="400" cy="100" r="25" fill="white" opacity="0.1"/>
  
  <!-- Main content card -->
  <rect x="40" y="150" width="420" height="200" rx="20" fill="white" opacity="0.95" filter="url(#shadow)"/>
  
  <!-- TNS Logo/Brand -->
  <text x="250" y="120" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
        fill="white" text-anchor="middle" opacity="0.9">
    TNS
  </text>
  
  <!-- Domain name - centered and prominent -->
  <text x="250" y="240" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        fill="#2C3E50" text-anchor="middle">
    ${domainName}
  </text>
  
  <!-- Subtitle -->
  <text x="250" y="280" font-family="Arial, sans-serif" font-size="16" 
        fill="#7F8C8D" text-anchor="middle">
    Trust Name Service Domain
  </text>
  
  <!-- Token ID badge -->
  <rect x="190" y="300" width="120" height="30" rx="15" fill="${gradientColors.start}" opacity="0.2"/>
  <text x="250" y="320" font-family="Arial, sans-serif" font-size="14" 
        fill="#2C3E50" text-anchor="middle">
    Token #${tokenId}
  </text>
  
  <!-- Bottom text -->
  <text x="250" y="430" font-family="Arial, sans-serif" font-size="14" 
        fill="white" text-anchor="middle" opacity="0.8">
    Intuition Mainnet
  </text>
</svg>`;
}
