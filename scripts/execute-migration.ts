import { ethers } from "ethers";
import * as fs from "fs/promises";

// Configuration
const NEW_CONTRACT_ADDRESS = "0xF5D672880CE1288cB41C8283fe90B68Efc2f6db7";
const RPC_URL = "https://testnet.rpc.intuition.systems";
const BATCH_SIZE = 10; // Process 10 domains per transaction to avoid gas limits

// New contract ABI - includes migration functions
const NEW_CONTRACT_ABI = [
  "function batchMigrateDomains(string[] domainNames, address[] owners, uint256[] expirationTimes, uint256[] oldTokenIds) external",
  "function batchSetPrimaryDomains(address[] owners, string[] domainNames) external",
  "function owner() view returns (address)",
];

interface MigrationData {
  domains: Array<{
    name: string;
    owner: string;
    tokenId: number;
    expirationTime: number;
    isPrimary: boolean;
  }>;
}

async function loadMigrationData(filename: string): Promise<MigrationData> {
  console.log(`📂 Loading migration data from ${filename}...`);
  const data = await fs.readFile(filename, 'utf-8');
  return JSON.parse(data);
}

async function executeMigration(privateKey: string, migrationFile: string) {
  console.log("\n🚀 TNS Domain Migration Executor\n");

  // Load migration data
  const migrationData = await loadMigrationData(migrationFile);
  const allDomains = migrationData.domains;
  
  console.log(`✅ Loaded ${allDomains.length} domains to migrate\n`);

  // Connect to network
  console.log("🔗 Connecting to Intuition testnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(NEW_CONTRACT_ADDRESS, NEW_CONTRACT_ABI, wallet);

  // Verify we're the contract owner
  console.log(`📝 Wallet address: ${wallet.address}`);
  const contractOwner = await contract.owner();
  console.log(`🔐 Contract owner: ${contractOwner}`);
  
  if (wallet.address.toLowerCase() !== contractOwner.toLowerCase()) {
    throw new Error("❌ You are not the contract owner! Migration can only be performed by the owner.");
  }
  console.log("✅ Owner verified!\n");

  // Remove .trust suffix from domain names
  const domainsToMigrate = allDomains.map(d => ({
    ...d,
    name: d.name.replace('.trust', '')
  }));

  // Split into batches
  const batches = [];
  for (let i = 0; i < domainsToMigrate.length; i += BATCH_SIZE) {
    batches.push(domainsToMigrate.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Split into ${batches.length} batches of ${BATCH_SIZE} domains each\n`);

  // Migrate domains in batches
  let migratedCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    console.log(`\n🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} domains)...`);
    
    const names = batch.map(d => d.name);
    const owners = batch.map(d => d.owner);
    const expirations = batch.map(d => d.expirationTime);
    const tokenIds = batch.map(d => d.tokenId);

    try {
      const tx = await contract.batchMigrateDomains(names, owners, expirations, tokenIds);
      console.log(`   📤 Transaction sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      migratedCount += batch.length;
      console.log(`   📊 Progress: ${migratedCount}/${domainsToMigrate.length} domains migrated`);
    } catch (error: any) {
      console.error(`   ❌ Batch ${i + 1} failed:`, error.message);
      console.log(`   ⚠️  Continuing with next batch...`);
    }
  }

  // Migrate primary domains
  console.log("\n\n🎯 Migrating primary domains...");
  const primaryDomains = domainsToMigrate.filter(d => d.isPrimary);
  
  if (primaryDomains.length > 0) {
    console.log(`   Found ${primaryDomains.length} primary domains to set`);
    
    const primaryOwners = primaryDomains.map(d => d.owner);
    const primaryNames = primaryDomains.map(d => d.name);
    
    try {
      const tx = await contract.batchSetPrimaryDomains(primaryOwners, primaryNames);
      console.log(`   📤 Transaction sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Primary domains set! Block: ${receipt.blockNumber}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to set primary domains:`, error.message);
    }
  } else {
    console.log("   ℹ️  No primary domains to migrate");
  }

  console.log("\n" + "=".repeat(80));
  console.log("✨ MIGRATION COMPLETE!");
  console.log("=".repeat(80));
  console.log(`Total domains migrated: ${migratedCount}/${domainsToMigrate.length}`);
  console.log(`Contract address: ${NEW_CONTRACT_ADDRESS}`);
  console.log(`View on explorer: https://testnet.explorer.intuition.systems/address/${NEW_CONTRACT_ADDRESS}`);
  console.log("=".repeat(80));
  console.log();
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("\n❌ Usage: tsx execute-migration.ts <PRIVATE_KEY> <migration-data-file.json>\n");
    console.error("Example:");
    console.error("  tsx execute-migration.ts 0x1234... migration-data-1234567890.json\n");
    process.exit(1);
  }

  const [privateKey, migrationFile] = args;
  
  // Validate private key format
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    console.error("❌ Invalid private key format. Must be 0x followed by 64 hex characters\n");
    process.exit(1);
  }

  try {
    await executeMigration(privateKey, migrationFile);
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
