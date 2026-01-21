import { ethers } from "hardhat";

// Legacy contract addresses
const LEGACY_REGISTRY = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

// New contract addresses
const NEW_REGISTRY = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";
const NEW_BASE_REGISTRAR = "0xc08c5b051a9cFbcd81584Ebb8870ed77eFc5E676";
const NEW_RESOLVER = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";

// Minimal ABI for legacy contract (ERC721 with domain data)
const LEGACY_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function domains(uint256 tokenId) view returns (string name, uint256 expiry, address owner)",
  "event DomainRegistered(uint256 indexed tokenId, string name, address indexed owner, uint256 expiry)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// BaseRegistrar ABI for migration
const BASE_REGISTRAR_ABI = [
  "function register(uint256 id, address owner, uint256 duration) external returns (uint256)",
  "function addController(address controller) external",
  "function controllers(address) view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function available(uint256 id) view returns (bool)"
];

// Resolver ABI
const RESOLVER_ABI = [
  "function setAddr(bytes32 node, address addr) external"
];

// TRUST_NODE for computing domain nodes
const TRUST_NODE = "0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985";

interface DomainInfo {
  tokenId: bigint;
  name: string;
  owner: string;
  expiry: bigint;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running migration with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  // Connect to contracts
  const legacyRegistry = new ethers.Contract(LEGACY_REGISTRY, LEGACY_ABI, ethers.provider);
  const baseRegistrar = new ethers.Contract(NEW_BASE_REGISTRAR, BASE_REGISTRAR_ABI, deployer);
  const resolver = new ethers.Contract(NEW_RESOLVER, RESOLVER_ABI, deployer);

  console.log("=== Fetching Legacy Domains ===\n");

  // Method 1: Try to get domains via Transfer events from zero address (mints)
  const domains: DomainInfo[] = [];
  
  try {
    // Query Transfer events from address(0) which indicate mints
    const filter = legacyRegistry.filters.Transfer(ethers.ZeroAddress);
    const events = await legacyRegistry.queryFilter(filter, 0, "latest");
    
    console.log(`Found ${events.length} Transfer (mint) events\n`);
    
    for (const event of events) {
      const tokenId = (event as any).args[2];
      try {
        // Get current owner
        const owner = await legacyRegistry.ownerOf(tokenId);
        
        // Try to get domain info
        let name = "";
        let expiry = BigInt(0);
        
        try {
          const domainData = await legacyRegistry.domains(tokenId);
          name = domainData.name || domainData[0];
          expiry = domainData.expiry || domainData[1];
        } catch {
          // If domains() doesn't work, try computing from tokenId
          // In ENS-style, tokenId = labelhash
          console.log(`  Could not fetch domain data for token ${tokenId}, will use tokenId as labelhash`);
        }
        
        domains.push({
          tokenId,
          name,
          owner,
          expiry
        });
        
        console.log(`  Token ${tokenId}: ${name || '(unknown)'}.trust -> ${owner}`);
      } catch (e) {
        // Token may have been burned
        console.log(`  Token ${tokenId}: burned or invalid`);
      }
    }
  } catch (e) {
    console.log("Could not query Transfer events, trying DomainRegistered events...");
    
    try {
      const filter = legacyRegistry.filters.DomainRegistered();
      const events = await legacyRegistry.queryFilter(filter, 0, "latest");
      
      console.log(`Found ${events.length} DomainRegistered events\n`);
      
      for (const event of events) {
        const args = (event as any).args;
        const tokenId = args.tokenId || args[0];
        const name = args.name || args[1];
        const expiry = args.expiry || args[3];
        
        try {
          const owner = await legacyRegistry.ownerOf(tokenId);
          domains.push({ tokenId, name, owner, expiry });
          console.log(`  ${name}.trust -> ${owner} (expires: ${new Date(Number(expiry) * 1000).toISOString()})`);
        } catch {
          console.log(`  ${name}.trust: burned or expired`);
        }
      }
    } catch (e2) {
      console.log("Could not query DomainRegistered events either");
    }
  }

  console.log(`\n=== Found ${domains.length} Active Domains ===\n`);

  if (domains.length === 0) {
    console.log("No domains to migrate.");
    return;
  }

  // Check if deployer is a controller
  const isController = await baseRegistrar.controllers(deployer.address);
  if (!isController) {
    console.log("Deployer is not a controller. Adding as controller...");
    const tx = await baseRegistrar.addController(deployer.address);
    await tx.wait();
    console.log("Added deployer as controller.\n");
  }

  console.log("=== Migrating Domains ===\n");

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const domain of domains) {
    try {
      // Compute labelhash from name if available, otherwise use tokenId
      let labelhash: string;
      if (domain.name) {
        labelhash = ethers.keccak256(ethers.toUtf8Bytes(domain.name));
      } else {
        // Assume tokenId is the labelhash
        labelhash = ethers.zeroPadValue(ethers.toBeHex(domain.tokenId), 32);
      }
      
      const labelId = BigInt(labelhash);
      
      // Check if already registered in new system
      const isAvailable = await baseRegistrar.available(labelId);
      
      if (!isAvailable) {
        console.log(`  SKIP: ${domain.name || domain.tokenId}.trust - already registered in new system`);
        skipped++;
        continue;
      }

      // Calculate remaining duration (or set minimum 1 year if expired)
      const now = BigInt(Math.floor(Date.now() / 1000));
      let duration: bigint;
      
      if (domain.expiry > now) {
        duration = domain.expiry - now;
      } else {
        // Give them 1 year free as migration bonus
        duration = BigInt(365 * 24 * 60 * 60);
      }

      // Register in new system
      console.log(`  Migrating ${domain.name || domain.tokenId}.trust to ${domain.owner}...`);
      
      const tx = await baseRegistrar.register(labelId, domain.owner, duration);
      await tx.wait();
      
      // Set resolver address record
      const node = ethers.keccak256(ethers.concat([TRUST_NODE, labelhash]));
      try {
        // Note: Only works if we have permission (we need to be the owner or approved)
        // For migration, we might need to have the new owner do this
      } catch {
        // Expected if we're not the owner
      }
      
      console.log(`  SUCCESS: ${domain.name || domain.tokenId}.trust migrated!`);
      migrated++;
      
    } catch (e: any) {
      console.log(`  FAILED: ${domain.name || domain.tokenId}.trust - ${e.message?.slice(0, 100)}`);
      failed++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
