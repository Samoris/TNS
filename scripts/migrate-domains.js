/**
 * TNS Domain Migration Script
 * 
 * This script exports domain data from the old TNS contract and prepares
 * it for migration to the new whitelist-enabled contract.
 * 
 * Usage:
 *   node scripts/migrate-domains.js export           # Export domain data
 *   node scripts/migrate-domains.js migrate          # Execute migration (requires private key)
 *   node scripts/migrate-domains.js verify           # Verify migration
 */

const { ethers } = require('ethers');

// Configuration
const OLD_CONTRACT_ADDRESS = "0xdfe1aB8532925de628C419B65B41f23997c34B4a";
const RPC_URL = "https://testnet.rpc.intuition.systems";
const CHAIN_ID = 13579;

// Old contract ABI (minimal needed for export)
const OLD_CONTRACT_ABI = [
  "event DomainRegistered(string indexed domain, address indexed owner, uint256 indexed tokenId, uint256 expirationTime)",
  "function getDomainInfo(string) view returns (address, uint256, uint256, bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)"
];

// New contract ABI (minimal needed for migration)
const NEW_CONTRACT_ABI = [
  "function adminMigrateDomainBatch(string[] calldata domains, address[] calldata owners, uint256[] calldata expirationTimes) external",
  "function adminMigrateDomain(string calldata domain, address owner, uint256 expirationTime) external",
  "function getDomainInfo(string) view returns (address, uint256, uint256, bool)",
  "function owner() view returns (address)"
];

/**
 * Export all active domains from the old contract
 */
async function exportDomains() {
  console.log("🔍 Connecting to Intuition testnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(OLD_CONTRACT_ADDRESS, OLD_CONTRACT_ABI, provider);
  
  console.log("📡 Fetching DomainRegistered events...");
  console.log("   (This may take a minute...)\n");
  
  // Get all DomainRegistered events from the contract
  const filter = contract.filters.DomainRegistered();
  const currentBlock = await provider.getBlockNumber();
  
  // Query events in chunks to avoid RPC limits
  const CHUNK_SIZE = 250000;
  let allEvents = [];
  
  // Estimate starting block (contract deployed around block 6400000)
  const startBlock = 6400000;
  
  for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    process.stdout.write(`   Querying blocks ${fromBlock} to ${toBlock}...`);
    
    try {
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      allEvents = allEvents.concat(events);
      console.log(` Found ${events.length} events`);
      
      if (events.length === 0 && allEvents.length > 0) {
        // If we found events before and now finding none, we can stop
        console.log("   Reached end of events, stopping search.");
        break;
      }
    } catch (error) {
      console.log(` Error: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Found ${allEvents.length} total registration events\n`);
  
  // Track unique domains (in case of duplicates from events)
  const domainMap = new Map();
  
  for (const event of allEvents) {
    const domainName = event.args.domain;
    const owner = event.args.owner;
    const expirationTime = event.args.expirationTime;
    
    // Store latest event for each domain
    domainMap.set(domainName, {
      domain: domainName,
      initialOwner: owner,
      expirationTime: expirationTime.toString()
    });
  }
  
  console.log("🔄 Verifying current domain status...\n");
  
  const activeDomains = [];
  const expiredDomains = [];
  const currentTime = Math.floor(Date.now() / 1000);
  
  for (const [domainName, data] of domainMap) {
    try {
      const [currentOwner, tokenId, expiration, exists] = await contract.getDomainInfo(domainName);
      
      if (exists) {
        const expirationNum = Number(expiration);
        const domainData = {
          domain: domainName,
          owner: currentOwner, // Use current owner (in case of transfers)
          expirationTime: expiration.toString(),
          tokenId: tokenId.toString(),
          isExpired: expirationNum < currentTime,
          daysUntilExpiry: Math.floor((expirationNum - currentTime) / 86400)
        };
        
        if (expirationNum >= currentTime) {
          activeDomains.push(domainData);
          console.log(`✓ ${domainName}.trust - Owner: ${currentOwner.slice(0, 10)}... Expires in ${domainData.daysUntilExpiry} days`);
        } else {
          expiredDomains.push(domainData);
          console.log(`⚠ ${domainName}.trust - EXPIRED ${Math.abs(domainData.daysUntilExpiry)} days ago`);
        }
      }
    } catch (error) {
      console.log(`✗ ${domainName}.trust - Error: ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Active domains: ${activeDomains.length}`);
  console.log(`   Expired domains: ${expiredDomains.length}`);
  console.log(`   Total: ${activeDomains.length + expiredDomains.length}`);
  console.log("=".repeat(60) + "\n");
  
  // Save to files
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.join(__dirname, '../migration-data');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save active domains (these should be migrated)
  const activeOutputPath = path.join(outputDir, 'active-domains.json');
  fs.writeFileSync(activeOutputPath, JSON.stringify(activeDomains, null, 2));
  console.log(`💾 Active domains saved to: ${activeOutputPath}`);
  
  // Save expired domains (for reference)
  const expiredOutputPath = path.join(outputDir, 'expired-domains.json');
  fs.writeFileSync(expiredOutputPath, JSON.stringify(expiredDomains, null, 2));
  console.log(`💾 Expired domains saved to: ${expiredOutputPath}`);
  
  // Generate migration arrays for batch function
  const migrationData = {
    domains: activeDomains.map(d => d.domain),
    owners: activeDomains.map(d => d.owner),
    expirationTimes: activeDomains.map(d => d.expirationTime),
    totalDomains: activeDomains.length,
    estimatedGas: activeDomains.length * 120000
  };
  
  const migrationOutputPath = path.join(outputDir, 'migration-batch.json');
  fs.writeFileSync(migrationOutputPath, JSON.stringify(migrationData, null, 2));
  console.log(`💾 Migration batch data saved to: ${migrationOutputPath}\n`);
  
  // Print migration instructions
  console.log("📝 Next Steps:");
  console.log("1. Deploy the new whitelist contract");
  console.log("2. Update NEW_CONTRACT_ADDRESS in this script");
  console.log("3. Run: node scripts/migrate-domains.js migrate");
  console.log("4. Or manually migrate using Remix with the data from migration-batch.json\n");
  
  return { activeDomains, expiredDomains, migrationData };
}

/**
 * Execute migration to new contract
 */
async function executeMigration(newContractAddress, privateKey) {
  if (!newContractAddress || newContractAddress === "YOUR_NEW_CONTRACT_ADDRESS") {
    console.error("❌ Error: Please set NEW_CONTRACT_ADDRESS in the script");
    console.log("   Deploy the new contract first, then update the address.");
    return;
  }
  
  if (!privateKey) {
    console.error("❌ Error: Private key required for migration");
    console.log("   Usage: node scripts/migrate-domains.js migrate YOUR_PRIVATE_KEY");
    console.log("   Or set PRIVATE_KEY environment variable");
    return;
  }
  
  console.log("🔍 Loading migration data...");
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../migration-data/migration-batch.json');
  
  if (!fs.existsSync(migrationPath)) {
    console.error("❌ Migration data not found. Run export first:");
    console.log("   node scripts/migrate-domains.js export");
    return;
  }
  
  const migrationData = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
  
  console.log(`📊 Migration Summary:`);
  console.log(`   Domains to migrate: ${migrationData.totalDomains}`);
  console.log(`   Estimated gas: ${migrationData.estimatedGas.toLocaleString()}`);
  console.log(`   New contract: ${newContractAddress}\n`);
  
  console.log("🔗 Connecting to Intuition testnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(newContractAddress, NEW_CONTRACT_ABI, wallet);
  
  // Verify we're the owner
  const owner = await contract.owner();
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error(`❌ Error: Wallet ${wallet.address} is not the contract owner`);
    console.log(`   Contract owner: ${owner}`);
    return;
  }
  
  console.log(`✅ Confirmed: You are the contract owner\n`);
  
  // Ask for confirmation
  console.log("⚠️  You are about to migrate domains to the new contract.");
  console.log("   This will execute a blockchain transaction.\n");
  
  // Check if we should proceed (in automated mode, auto-confirm)
  if (process.env.AUTO_CONFIRM !== 'true') {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      readline.question('   Continue? (yes/no): ', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log("\n❌ Migration cancelled");
          process.exit(0);
        }
        resolve();
      });
    });
  }
  
  console.log("\n🚀 Executing migration transaction...");
  
  try {
    const tx = await contract.adminMigrateDomainBatch(
      migrationData.domains,
      migrationData.owners,
      migrationData.expirationTimes,
      {
        gasLimit: migrationData.estimatedGas + 500000 // Add buffer
      }
    );
    
    console.log(`📝 Transaction submitted: ${tx.hash}`);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    console.log(`\n✅ Migration successful!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Domains migrated: ${migrationData.totalDomains}\n`);
    
    // Verify migration
    console.log("🔍 Verifying migration...");
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < migrationData.domains.length; i++) {
      const domain = migrationData.domains[i];
      const expectedOwner = migrationData.owners[i];
      
      try {
        const [owner, , , exists] = await contract.getDomainInfo(domain);
        if (exists && owner.toLowerCase() === expectedOwner.toLowerCase()) {
          successCount++;
          console.log(`   ✓ ${domain}.trust verified`);
        } else {
          failCount++;
          console.log(`   ✗ ${domain}.trust verification failed`);
        }
      } catch (error) {
        failCount++;
        console.log(`   ✗ ${domain}.trust error: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Verification complete:`);
    console.log(`   Successful: ${successCount}/${migrationData.totalDomains}`);
    if (failCount > 0) {
      console.log(`   Failed: ${failCount}`);
    }
    
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(`   ${error.message}`);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
  }
}

/**
 * Verify migration was successful
 */
async function verifyMigration(newContractAddress) {
  if (!newContractAddress || newContractAddress === "YOUR_NEW_CONTRACT_ADDRESS") {
    console.error("❌ Error: Please set NEW_CONTRACT_ADDRESS in the script");
    return;
  }
  
  console.log("🔍 Loading migration data...");
  const fs = require('fs');
  const path = require('path');
  const migrationPath = path.join(__dirname, '../migration-data/migration-batch.json');
  
  if (!fs.existsSync(migrationPath)) {
    console.error("❌ Migration data not found");
    return;
  }
  
  const migrationData = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
  
  console.log("🔗 Connecting to new contract...");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(newContractAddress, NEW_CONTRACT_ABI, provider);
  
  console.log("🔍 Verifying all domains...\n");
  
  let successCount = 0;
  let failCount = 0;
  const failed = [];
  
  for (let i = 0; i < migrationData.domains.length; i++) {
    const domain = migrationData.domains[i];
    const expectedOwner = migrationData.owners[i];
    const expectedExpiration = migrationData.expirationTimes[i];
    
    try {
      const [owner, , expiration, exists] = await contract.getDomainInfo(domain);
      
      if (exists && 
          owner.toLowerCase() === expectedOwner.toLowerCase() &&
          expiration.toString() === expectedExpiration) {
        successCount++;
        console.log(`✓ ${domain}.trust - Owner and expiration match`);
      } else {
        failCount++;
        failed.push(domain);
        console.log(`✗ ${domain}.trust - Mismatch detected`);
        if (!exists) console.log(`   Domain doesn't exist`);
        if (owner.toLowerCase() !== expectedOwner.toLowerCase()) {
          console.log(`   Owner: expected ${expectedOwner}, got ${owner}`);
        }
        if (expiration.toString() !== expectedExpiration) {
          console.log(`   Expiration: expected ${expectedExpiration}, got ${expiration.toString()}`);
        }
      }
    } catch (error) {
      failCount++;
      failed.push(domain);
      console.log(`✗ ${domain}.trust - Error: ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`📊 Verification Summary:`);
  console.log(`   Successful: ${successCount}/${migrationData.totalDomains}`);
  console.log(`   Failed: ${failCount}`);
  if (failed.length > 0) {
    console.log(`   Failed domains: ${failed.join(', ')}`);
  }
  console.log("=".repeat(60));
}

// Main execution
const command = process.argv[2];
const arg1 = process.argv[3];

// Update this after deploying the new contract
const NEW_CONTRACT_ADDRESS = arg1 || process.env.NEW_CONTRACT_ADDRESS || "YOUR_NEW_CONTRACT_ADDRESS";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

(async () => {
  try {
    switch (command) {
      case 'export':
        await exportDomains();
        break;
      
      case 'migrate':
        const privateKey = arg1 || PRIVATE_KEY;
        await executeMigration(NEW_CONTRACT_ADDRESS, privateKey);
        break;
      
      case 'verify':
        await verifyMigration(NEW_CONTRACT_ADDRESS);
        break;
      
      default:
        console.log("TNS Domain Migration Script");
        console.log("===========================\n");
        console.log("Usage:");
        console.log("  node scripts/migrate-domains.js export");
        console.log("     → Export domain data from old contract\n");
        console.log("  node scripts/migrate-domains.js migrate [PRIVATE_KEY]");
        console.log("     → Execute migration to new contract");
        console.log("     → Or set PRIVATE_KEY and NEW_CONTRACT_ADDRESS env vars\n");
        console.log("  node scripts/migrate-domains.js verify");
        console.log("     → Verify migration was successful\n");
        console.log("Environment Variables:");
        console.log("  NEW_CONTRACT_ADDRESS - Address of deployed whitelist contract");
        console.log("  PRIVATE_KEY - Your private key (for migration only)");
        console.log("  AUTO_CONFIRM - Set to 'true' to skip confirmation prompts");
        break;
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
