import { ethers } from "ethers";

// Contract addresses
const OLD_CONTRACT_ADDRESS = "0xdfe1aB8532925de628C419B65B41f23997c34B4a";
const NEW_CONTRACT_ADDRESS = "0xF5D672880CE1288cB41C8283fe90B68Efc2f6db7";
const RPC_URL = "https://testnet.rpc.intuition.systems";

// Minimal ABI for reading old contract data
const OLD_CONTRACT_ABI = [
  "event DomainRegistered(string indexed domain, address indexed owner, uint256 indexed tokenId, uint256 expirationTime)",
  "function getDomainInfo(string domain) view returns (address domainOwner, uint256 tokenId, uint256 expirationTime, bool exists)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenIdToDomain(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function primaryDomain(address owner) view returns (string)",
];

interface DomainData {
  name: string;
  owner: string;
  tokenId: number;
  expirationTime: number;
  isPrimary: boolean;
}

async function fetchAllDomains(): Promise<DomainData[]> {
  console.log("🔍 Connecting to Intuition testnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const oldContract = new ethers.Contract(OLD_CONTRACT_ADDRESS, OLD_CONTRACT_ABI, provider);

  console.log("📊 Fetching total supply...");
  const totalSupply = await oldContract.totalSupply();
  console.log(`   Found ${totalSupply} total domains minted\n`);

  const domains: DomainData[] = [];
  const primaryDomains = new Map<string, string>(); // owner -> domain name

  console.log("🔄 Fetching domain data...");
  
  // Fetch all domains by iterating through token IDs
  for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
    try {
      // Get domain name from token ID
      const domainName = await oldContract.tokenIdToDomain(tokenId);
      
      if (!domainName) {
        console.log(`   ⚠️  Token ${tokenId}: No domain name found (burned?)`);
        continue;
      }

      // Get domain info
      const [owner, , expirationTime, exists] = await oldContract.getDomainInfo(domainName);
      
      if (!exists || owner === ethers.ZeroAddress) {
        console.log(`   ⚠️  Token ${tokenId} (${domainName}): Domain doesn't exist or expired`);
        continue;
      }

      // Check if this is someone's primary domain
      if (!primaryDomains.has(owner)) {
        const primaryDomain = await oldContract.primaryDomain(owner);
        if (primaryDomain) {
          primaryDomains.set(owner, primaryDomain);
        }
      }

      const isPrimary = primaryDomains.get(owner) === domainName;

      domains.push({
        name: domainName,
        owner,
        tokenId,
        expirationTime: Number(expirationTime),
        isPrimary,
      });

      console.log(`   ✅ Token ${tokenId}: ${domainName} (owner: ${owner.slice(0, 8)}..., expires: ${new Date(Number(expirationTime) * 1000).toLocaleDateString()})${isPrimary ? ' [PRIMARY]' : ''}`);
    } catch (error) {
      console.error(`   ❌ Error fetching token ${tokenId}:`, error.message);
    }
  }

  console.log(`\n✨ Successfully fetched ${domains.length} active domains\n`);
  return domains;
}

function generateMigrationReport(domains: DomainData[]): void {
  console.log("=".repeat(80));
  console.log("MIGRATION REPORT");
  console.log("=".repeat(80));
  console.log(`Total domains to migrate: ${domains.length}`);
  console.log(`Old contract: ${OLD_CONTRACT_ADDRESS}`);
  console.log(`New contract: ${NEW_CONTRACT_ADDRESS}`);
  console.log("=".repeat(80));
  console.log();

  // Group by owner
  const domainsByOwner = new Map<string, DomainData[]>();
  domains.forEach(domain => {
    if (!domainsByOwner.has(domain.owner)) {
      domainsByOwner.set(domain.owner, []);
    }
    domainsByOwner.get(domain.owner)!.push(domain);
  });

  console.log(`📊 Statistics:`);
  console.log(`   - Total unique owners: ${domainsByOwner.size}`);
  console.log(`   - Total domains: ${domains.length}`);
  console.log(`   - Primary domains set: ${domains.filter(d => d.isPrimary).length}`);
  console.log();

  // Calculate pricing tiers
  const tiers = { threeChar: 0, fourChar: 0, fivePlus: 0 };
  domains.forEach(domain => {
    const nameWithoutTrust = domain.name.replace('.trust', '');
    if (nameWithoutTrust.length === 3) tiers.threeChar++;
    else if (nameWithoutTrust.length === 4) tiers.fourChar++;
    else tiers.fivePlus++;
  });

  console.log(`📈 Domain distribution by length:`);
  console.log(`   - 3 characters: ${tiers.threeChar} domains`);
  console.log(`   - 4 characters: ${tiers.fourChar} domains`);
  console.log(`   - 5+ characters: ${tiers.fivePlus} domains`);
  console.log();

  console.log("=".repeat(80));
  console.log();
}

async function saveMigrationData(domains: DomainData[]): Promise<void> {
  const fs = await import('fs/promises');
  const migrationData = {
    timestamp: new Date().toISOString(),
    oldContract: OLD_CONTRACT_ADDRESS,
    newContract: NEW_CONTRACT_ADDRESS,
    totalDomains: domains.length,
    domains: domains.map(d => ({
      name: d.name,
      owner: d.owner,
      tokenId: d.tokenId,
      expirationTime: d.expirationTime,
      expirationDate: new Date(d.expirationTime * 1000).toISOString(),
      isPrimary: d.isPrimary,
    })),
  };

  const filename = `migration-data-${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(migrationData, null, 2));
  console.log(`💾 Migration data saved to: ${filename}`);
  console.log();
}

// Main execution
async function main() {
  try {
    console.log("\n🚀 TNS Domain Migration Tool\n");
    
    const domains = await fetchAllDomains();
    generateMigrationReport(domains);
    await saveMigrationData(domains);

    console.log("✅ Migration data collection complete!");
    console.log();
    console.log("⚠️  IMPORTANT: The new contract needs a migration function to efficiently");
    console.log("   transfer these domains. Options:");
    console.log();
    console.log("   1. Add an admin-only batchMigrate() function to the contract");
    console.log("   2. Use the owner wallet to manually register each domain (costly)");
    console.log("   3. Create a migration contract that coordinates the transfer");
    console.log();
    console.log("   Recommended: Add a migration function to the new contract.");
    console.log();

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
