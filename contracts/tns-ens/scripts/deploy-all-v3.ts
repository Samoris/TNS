import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYER = "0xDC1DE801d1a38cBCFBc91Ca019c0F2fCcAf1AD14";

const TRUST_LABEL = ethers.keccak256(ethers.toUtf8Bytes("trust"));
const REVERSE_LABEL = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
const ADDR_LABEL = ethers.keccak256(ethers.toUtf8Bytes("addr"));
const ROOT_NODE = ethers.ZeroHash;
const TRUST_NODE = ethers.namehash("trust");
const REVERSE_NODE = ethers.namehash("reverse");
const ADDR_REVERSE_NODE = ethers.namehash("addr.reverse");

const RENT_PRICES = [
  ethers.parseUnits("100", 18) / BigInt(365 * 24 * 3600), // 1 char
  ethers.parseUnits("100", 18) / BigInt(365 * 24 * 3600), // 2 chars
  ethers.parseUnits("100", 18) / BigInt(365 * 24 * 3600), // 3 chars (100/year)
  ethers.parseUnits("70", 18) / BigInt(365 * 24 * 3600),  // 4 chars (70/year)
  ethers.parseUnits("30", 18) / BigInt(365 * 24 * 3600),  // 5+ chars (30/year)
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying all contracts with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  // =============================================
  // 1. Deploy TNSRegistry
  // =============================================
  console.log("1. Deploying TNSRegistry...");
  const RegistryFactory = await ethers.getContractFactory("TNSRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("   TNSRegistry:", registryAddr);

  // =============================================
  // 2. Deploy BaseRegistrarImplementation
  // =============================================
  console.log("2. Deploying BaseRegistrarImplementation...");
  const BaseRegistrarFactory = await ethers.getContractFactory("BaseRegistrarImplementation");
  const baseRegistrar = await BaseRegistrarFactory.deploy(registryAddr, TRUST_NODE, 0);
  await baseRegistrar.waitForDeployment();
  const baseRegistrarAddr = await baseRegistrar.getAddress();
  console.log("   BaseRegistrar:", baseRegistrarAddr);

  // =============================================
  // 3. Deploy DummyOracle (1e18 = 1 USD/TRUST)
  // =============================================
  console.log("3. Deploying DummyOracle...");
  const DummyOracleFactory = await ethers.getContractFactory("DummyOracle");
  const dummyOracle = await DummyOracleFactory.deploy(ethers.parseEther("1"));
  await dummyOracle.waitForDeployment();
  const dummyOracleAddr = await dummyOracle.getAddress();
  console.log("   DummyOracle:", dummyOracleAddr);

  // =============================================
  // 4. Deploy StablePriceOracle
  // =============================================
  console.log("4. Deploying StablePriceOracle...");
  const StablePriceOracleFactory = await ethers.getContractFactory("StablePriceOracle");
  const priceOracle = await StablePriceOracleFactory.deploy(dummyOracleAddr, RENT_PRICES);
  await priceOracle.waitForDeployment();
  const priceOracleAddr = await priceOracle.getAddress();
  console.log("   StablePriceOracle:", priceOracleAddr);

  // =============================================
  // 5. Deploy ReverseRegistrar
  // =============================================
  console.log("5. Deploying ReverseRegistrar...");
  const ReverseRegistrarFactory = await ethers.getContractFactory("ReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrarFactory.deploy(registryAddr);
  await reverseRegistrar.waitForDeployment();
  const reverseRegistrarAddr = await reverseRegistrar.getAddress();
  console.log("   ReverseRegistrar:", reverseRegistrarAddr);

  // =============================================
  // 6. Deploy Root (uses DNSSEC — pass dummy addresses for oracle/registrar since we don't use DNS verification)
  // =============================================
  console.log("6. Deploying Root...");
  const RootFactory = await ethers.getContractFactory("Root");
  const root = await RootFactory.deploy(registryAddr, deployer.address, deployer.address);
  await root.waitForDeployment();
  const rootAddr = await root.getAddress();
  console.log("   Root:", rootAddr);

  // =============================================
  // 7. Deploy ETHRegistrarController
  // =============================================
  console.log("7. Deploying ETHRegistrarController...");
  const ControllerFactory = await ethers.getContractFactory("ETHRegistrarController");
  const controller = await ControllerFactory.deploy(baseRegistrarAddr, priceOracleAddr);
  await controller.waitForDeployment();
  const controllerAddr = await controller.getAddress();
  console.log("   ETHRegistrarController:", controllerAddr);

  // =============================================
  // 8. Deploy Resolver
  // =============================================
  console.log("8. Deploying Resolver...");
  const ResolverFactory = await ethers.getContractFactory("Resolver");
  const resolver = await ResolverFactory.deploy(registryAddr, controllerAddr, reverseRegistrarAddr);
  await resolver.waitForDeployment();
  const resolverAddr = await resolver.getAddress();
  console.log("   Resolver:", resolverAddr);

  // =============================================
  // 9. Deploy PaymentForwarder
  // =============================================
  console.log("9. Deploying PaymentForwarder...");
  const PaymentForwarderFactory = await ethers.getContractFactory("PaymentForwarder");
  const paymentForwarder = await PaymentForwarderFactory.deploy(registryAddr);
  await paymentForwarder.waitForDeployment();
  const paymentForwarderAddr = await paymentForwarder.getAddress();
  console.log("   PaymentForwarder:", paymentForwarderAddr);

  console.log("\n=== All 9 contracts deployed ===\n");

  // =============================================
  // POST-DEPLOYMENT SETUP
  // =============================================
  console.log("--- Setting up permissions ---\n");

  // Transfer registry root to Root contract
  console.log("10. Transferring registry root to Root contract...");
  const tx10 = await registry.setOwner(ROOT_NODE, rootAddr);
  await tx10.wait();
  console.log("    Done.");

  // Root gives .trust TLD to BaseRegistrar
  console.log("11. Root: setSubnodeOwner(.trust -> BaseRegistrar)...");
  const tx11 = await root.setSubnodeOwner(TRUST_LABEL, baseRegistrarAddr);
  await tx11.wait();
  console.log("    Done.");

  // Set up reverse registrar: create 'reverse' node
  console.log("12. Root: setSubnodeOwner(.reverse -> deployer)...");
  const tx12 = await root.setSubnodeOwner(REVERSE_LABEL, deployer.address);
  await tx12.wait();
  console.log("    Done.");

  // Create addr.reverse under reverse
  console.log("13. Registry: setSubnodeOwner(addr.reverse -> ReverseRegistrar)...");
  const tx13 = await registry.setSubnodeOwner(REVERSE_NODE, ADDR_LABEL, reverseRegistrarAddr);
  await tx13.wait();
  console.log("    Done.");

  // Add controller to BaseRegistrar
  console.log("14. BaseRegistrar: addController(ETHRegistrarController)...");
  const tx14 = await baseRegistrar.addController(controllerAddr);
  await tx14.wait();
  console.log("    Done.");

  // Add deployer as temporary controller for migration
  console.log("15. BaseRegistrar: addController(deployer) for migration...");
  const tx15 = await baseRegistrar.addController(deployer.address);
  await tx15.wait();
  console.log("    Done.");

  // Set default resolver on ReverseRegistrar
  console.log("16. ReverseRegistrar: setDefaultResolver...");
  const tx16 = await reverseRegistrar.setDefaultResolver(resolverAddr);
  await tx16.wait();
  console.log("    Done.");

  // Set controller on ReverseRegistrar
  console.log("17. ReverseRegistrar: setController(ETHRegistrarController)...");
  const tx17 = await reverseRegistrar.setController(controllerAddr, true);
  await tx17.wait();
  console.log("    Done.");

  // Lock .trust TLD
  console.log("18. Root: lock(.trust) to prevent TLD takeover...");
  // Root doesn't have lock() in this version, skip if not available
  console.log("    Skipped (Root uses DNSSEC model, .trust protected by TRUST_NODE check).");

  console.log("\n=== Setup complete ===\n");

  // =============================================
  // MIGRATION: Transfer all domains from V2
  // =============================================
  console.log("--- Starting domain migration ---\n");
  
  const migrationFile = path.join(__dirname, '..', '..', '..', 'server', 'migrated-domains.json');
  const migrationData = JSON.parse(fs.readFileSync(migrationFile, 'utf8'));
  const domains = migrationData.domains;

  console.log(`Migrating ${domains.length} domains from V2...\n`);

  // Read current owners and expiry dates from V2 BaseRegistrar
  const v2RegistrarAddr = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
  const v2Registrar = new ethers.Contract(v2RegistrarAddr, [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function nameExpires(uint256 id) view returns (uint256)"
  ], deployer);

  const BATCH_SIZE = 10;
  let migrated = 0;
  let failed = 0;
  const newMigrationData: any[] = [];

  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    
    for (const domain of batch) {
      const name = domain.name;
      const labelhash = ethers.keccak256(ethers.toUtf8Bytes(name));
      const tokenId = ethers.getBigInt(labelhash);

      try {
        const [owner, expires] = await Promise.all([
          v2Registrar.ownerOf(tokenId),
          v2Registrar.nameExpires(tokenId)
        ]);

        const expiresNum = Number(expires);
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresNum <= now) {
          console.log(`   [SKIP] ${name} - expired`);
          failed++;
          continue;
        }

        const duration = expiresNum - now;
        
        const tx = await baseRegistrar.register(tokenId, owner, duration);
        await tx.wait();
        
        migrated++;
        newMigrationData.push({
          oldTokenId: domain.oldTokenId || 0,
          name,
          newTokenId: tokenId.toString(),
          owner,
          expires: expiresNum
        });
        
        if (migrated % 10 === 0) {
          console.log(`   [${migrated}/${domains.length}] migrated...`);
        }
      } catch (e: any) {
        console.log(`   [FAIL] ${name}: ${e.message?.substring(0, 80)}`);
        failed++;
      }
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed\n`);

  // Remove deployer as controller
  console.log("19. BaseRegistrar: removeController(deployer)...");
  const tx19 = await baseRegistrar.removeController(deployer.address);
  await tx19.wait();
  console.log("    Done.");

  // Transfer Root ownership back (keep deployer as owner for now)
  console.log("20. Verifying final state...");
  const registryOwner = await registry.owner(TRUST_NODE);
  const isControllerActive = await baseRegistrar.controllers(controllerAddr);
  const isDeployerController = await baseRegistrar.controllers(deployer.address);
  console.log("    .trust node owner:", registryOwner);
  console.log("    Controller active:", isControllerActive);
  console.log("    Deployer still controller:", isDeployerController);

  // Update migrated-domains.json with new data
  const updatedMigration = {
    domains: newMigrationData,
    generatedAt: new Date().toISOString(),
    v3Contracts: {
      registry: registryAddr,
      baseRegistrar: baseRegistrarAddr,
      dummyOracle: dummyOracleAddr,
      stablePriceOracle: priceOracleAddr,
      reverseRegistrar: reverseRegistrarAddr,
      root: rootAddr,
      controller: controllerAddr,
      resolver: resolverAddr,
      paymentForwarder: paymentForwarderAddr,
    }
  };
  fs.writeFileSync(migrationFile, JSON.stringify(updatedMigration, null, 2));
  console.log("\n    Updated migrated-domains.json");

  // Print summary
  console.log("\n========================================");
  console.log("V3 DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log(`TNSRegistry:              ${registryAddr}`);
  console.log(`BaseRegistrar (ERC-721):  ${baseRegistrarAddr}`);
  console.log(`DummyOracle:              ${dummyOracleAddr}`);
  console.log(`StablePriceOracle:        ${priceOracleAddr}`);
  console.log(`ReverseRegistrar:         ${reverseRegistrarAddr}`);
  console.log(`Root:                     ${rootAddr}`);
  console.log(`ETHRegistrarController:   ${controllerAddr}`);
  console.log(`Resolver:                 ${resolverAddr}`);
  console.log(`PaymentForwarder:         ${paymentForwarderAddr}`);
  console.log("========================================");
  console.log(`Domains migrated: ${migrated}/${domains.length}`);
  console.log(`Balance remaining: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} TRUST`);
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
