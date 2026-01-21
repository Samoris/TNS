import { ethers } from "hardhat";

const LEGACY_REGISTRY = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";
const NEW_BASE_REGISTRAR = "0xc08c5b051a9cFbcd81584Ebb8870ed77eFc5E676";
const NEW_RESOLVER = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";
const NEW_REGISTRY = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";
const TRUST_NODE = "0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985";

interface DomainData {
  tokenId: number;
  name: string;
  owner: string;
}

async function extractDomains(): Promise<DomainData[]> {
  const contract = new ethers.Contract(LEGACY_REGISTRY, [
    "function ownerOf(uint256 tokenId) view returns (address)"
  ], ethers.provider);

  const transferFilter = {
    address: LEGACY_REGISTRY,
    topics: [
      ethers.id("Transfer(address,address,uint256)"),
      ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32)
    ],
    fromBlock: 0,
    toBlock: "latest"
  };

  const mintEvents = await ethers.provider.getLogs(transferFilter);
  const domains: DomainData[] = [];

  for (const event of mintEvents) {
    try {
      const tx = await ethers.provider.getTransaction(event.transactionHash);
      if (!tx) continue;

      const tokenId = parseInt(event.topics[3], 16);
      let name = "";
      const data = tx.data;

      if (data.length > 10) {
        const params = data.slice(10);
        for (let i = 0; i < params.length - 64; i += 64) {
          const chunk = params.slice(i, i + 64);
          const possibleLength = parseInt(chunk, 16);
          if (possibleLength > 0 && possibleLength < 64) {
            const strData = params.slice(i + 64, i + 64 + possibleLength * 2);
            try {
              const decoded = Buffer.from(strData, 'hex').toString('utf8');
              if (/^[a-z0-9-]+$/i.test(decoded) && decoded.length === possibleLength) {
                name = decoded.toLowerCase();
                break;
              }
            } catch {}
          }
        }
      }

      if (name) {
        let owner = "";
        try {
          owner = await contract.ownerOf(tokenId);
        } catch {
          continue; // Skip burned tokens
        }
        domains.push({ tokenId, name, owner });
      }
    } catch {}
  }

  return domains;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running proper migration with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  console.log("=== Extracting Domain Names from Blockchain ===\n");
  const domains = await extractDomains();
  console.log(`Found ${domains.length} domains with names\n`);

  const baseRegistrar = new ethers.Contract(NEW_BASE_REGISTRAR, [
    "function register(uint256 id, address owner, uint256 duration) external returns (uint256)",
    "function addController(address controller) external",
    "function controllers(address) view returns (bool)",
    "function available(uint256 id) view returns (bool)",
    "function reclaim(uint256 id, address owner) external"
  ], deployer);

  const resolver = new ethers.Contract(NEW_RESOLVER, [
    "function setAddr(bytes32 node, address addr) external"
  ], deployer);

  const registry = new ethers.Contract(NEW_REGISTRY, [
    "function setResolver(bytes32 node, address resolver) external"
  ], deployer);

  // Ensure deployer is controller
  const isController = await baseRegistrar.controllers(deployer.address);
  if (!isController) {
    console.log("Adding deployer as controller...");
    const tx = await baseRegistrar.addController(deployer.address);
    await tx.wait();
  }

  console.log("=== Migrating Domains with Proper Namehashes ===\n");

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // 1 year duration
  const duration = BigInt(365 * 24 * 60 * 60);

  for (const domain of domains) {
    try {
      // Calculate proper labelhash from name
      const labelhash = ethers.keccak256(ethers.toUtf8Bytes(domain.name));
      const labelId = BigInt(labelhash);
      
      // Calculate node for resolver
      const node = ethers.keccak256(ethers.concat([TRUST_NODE, labelhash]));

      // Check if available
      const isAvailable = await baseRegistrar.available(labelId);
      
      if (!isAvailable) {
        console.log(`  SKIP: ${domain.name}.trust - already registered`);
        skipped++;
        continue;
      }

      // Register with proper labelhash
      console.log(`  Registering ${domain.name}.trust (labelhash: ${labelhash.slice(0, 16)}...) to ${domain.owner.slice(0, 10)}...`);
      
      const regTx = await baseRegistrar.register(labelId, domain.owner, duration);
      await regTx.wait();

      migrated++;
      console.log(`  SUCCESS: ${domain.name}.trust`);

    } catch (e: any) {
      console.log(`  FAILED: ${domain.name}.trust - ${e.message?.slice(0, 80)}`);
      failed++;
    }
  }

  console.log("\n========================================");
  console.log("=== Migration Complete ===");
  console.log("========================================");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already registered): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
