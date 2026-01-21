// TNS Domain Migration Script
// Migrates existing domains from old contracts to new ENS-forked contracts

import { ethers } from "hardhat";

interface ExistingDomain {
  name: string;
  owner: string;
  tokenId: string;
  expirationDate: Date;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running migration with account:", deployer.address);

  // Configuration - set these before running
  const NEW_BASE_REGISTRAR_ADDRESS = process.env.NEW_BASE_REGISTRAR_ADDRESS || "";
  const NEW_CONTROLLER_ADDRESS = process.env.NEW_CONTROLLER_ADDRESS || "";
  const OLD_REGISTRY_ADDRESS = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

  if (!NEW_BASE_REGISTRAR_ADDRESS || !NEW_CONTROLLER_ADDRESS) {
    throw new Error("NEW_BASE_REGISTRAR_ADDRESS and NEW_CONTROLLER_ADDRESS required");
  }

  // Old registry ABI (just the functions we need)
  const oldRegistryAbi = [
    "function getDomainsByOwner(address owner) view returns (string[])",
    "function getDomainInfo(string name) view returns (tuple(uint256 tokenId, string name, address owner, uint256 registrationDate, uint256 expirationDate, address resolver))",
    "function totalSupply() view returns (uint256)",
    "event DomainRegistered(string indexed name, address indexed owner, uint256 indexed tokenId, uint256 expirationDate)",
  ];

  // New registrar ABI
  const newRegistrarAbi = [
    "function registerOnly(uint256 id, address owner, uint256 duration) returns (uint256)",
    "function addController(address controller)",
  ];

  const provider = ethers.provider;
  const oldRegistry = new ethers.Contract(OLD_REGISTRY_ADDRESS, oldRegistryAbi, provider);

  console.log("\n--- Scanning Existing Domains ---");

  // Scan for DomainRegistered events to get all domains
  const filter = oldRegistry.filters.DomainRegistered();
  const events = await oldRegistry.queryFilter(filter, 0, "latest");

  console.log(`Found ${events.length} registration events`);

  // Get unique domains with their latest state
  const domainMap = new Map<string, ExistingDomain>();

  for (const event of events) {
    if (event.args) {
      const name = event.args.name;
      try {
        const info = await oldRegistry.getDomainInfo(name);
        domainMap.set(name, {
          name,
          owner: info.owner,
          tokenId: info.tokenId.toString(),
          expirationDate: new Date(info.expirationDate.toNumber() * 1000),
        });
      } catch (e) {
        console.log(`Could not fetch info for ${name}, may be expired`);
      }
    }
  }

  const domains = Array.from(domainMap.values());
  console.log(`\nFound ${domains.length} active domains to migrate`);

  // Group by owner for batch processing
  const ownerDomains = new Map<string, ExistingDomain[]>();
  for (const domain of domains) {
    const existing = ownerDomains.get(domain.owner) || [];
    existing.push(domain);
    ownerDomains.set(domain.owner, existing);
  }

  console.log(`\nDomains grouped by ${ownerDomains.size} unique owners`);

  // Generate migration data
  console.log("\n--- Migration Data ---");
  console.log("Format: name, owner, tokenId, expiresAt, remainingDuration");

  const migrationData: Array<{
    name: string;
    owner: string;
    labelHash: string;
    duration: number;
  }> = [];

  const now = Date.now();

  for (const domain of domains) {
    const remainingMs = domain.expirationDate.getTime() - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    if (remainingSeconds > 0) {
      const labelHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(domain.name));
      migrationData.push({
        name: domain.name,
        owner: domain.owner,
        labelHash,
        duration: remainingSeconds,
      });
      console.log(`${domain.name}: ${domain.owner}, expires ${domain.expirationDate.toISOString()}, ${Math.floor(remainingSeconds / 86400)} days remaining`);
    } else {
      console.log(`${domain.name}: EXPIRED, skipping`);
    }
  }

  console.log(`\n${migrationData.length} domains ready for migration`);

  // Generate batch migration transaction data
  console.log("\n--- Batch Migration Calldata ---");

  const newRegistrar = new ethers.Contract(NEW_BASE_REGISTRAR_ADDRESS, newRegistrarAbi, deployer);

  console.log("\nTo execute migration, run these transactions:");
  console.log("(Make sure deployer is added as controller on new BaseRegistrar first)\n");
  console.log("// IMPORTANT: Use register() NOT registerOnly() to properly set registry ownership\n");

  for (const data of migrationData) {
    const tokenId = ethers.BigNumber.from(data.labelHash);
    console.log(`// Migrate ${data.name}.trust`);
    console.log(`await baseRegistrar.register(${tokenId.toString()}, "${data.owner}", ${data.duration});`);
    console.log("");
  }

  // Generate JSON export for frontend/backend sync
  const exportData = {
    timestamp: new Date().toISOString(),
    oldRegistry: OLD_REGISTRY_ADDRESS,
    newBaseRegistrar: NEW_BASE_REGISTRAR_ADDRESS,
    totalDomains: migrationData.length,
    domains: migrationData.map((d) => ({
      name: d.name,
      fullName: `${d.name}.trust`,
      owner: d.owner,
      tokenId: ethers.BigNumber.from(d.labelHash).toString(),
      durationSeconds: d.duration,
    })),
  };

  console.log("\n--- JSON Export ---");
  console.log(JSON.stringify(exportData, null, 2));

  return exportData;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
