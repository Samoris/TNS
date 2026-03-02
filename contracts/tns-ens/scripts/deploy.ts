import { ethers } from "hardhat";

/**
 * TNS Deployment Script
 * Exact port of ENS deployment with .eth -> .trust
 * 
 * Deployment Order:
 * 1. TNSRegistry
 * 2. BaseRegistrarImplementation
 * 3. DummyOracle (or real Chainlink AggregatorInterface)
 * 4. StablePriceOracle
 * 5. ReverseRegistrar
 * 6. Root
 * 7. TNSRegistrarController
 * 8. Post-deployment setup
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
  
  // Calculate .trust node: keccak256(abi.encodePacked(bytes32(0), keccak256("trust")))
  const TRUST_LABEL = ethers.keccak256(ethers.toUtf8Bytes("trust"));
  const ROOT_NODE = ethers.ZeroHash;
  const TRUST_NODE = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [ROOT_NODE, TRUST_LABEL]));
  
  // Calculate addr.reverse node
  const REVERSE_LABEL = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
  const ADDR_LABEL = ethers.keccak256(ethers.toUtf8Bytes("addr"));
  const REVERSE_NODE = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [ROOT_NODE, REVERSE_LABEL]));
  
  console.log("\n=== Node Hashes ===");
  console.log("TRUST_LABEL:", TRUST_LABEL);
  console.log("TRUST_NODE:", TRUST_NODE);
  console.log("REVERSE_NODE:", REVERSE_NODE);
  
  // ===== 1. Deploy TNSRegistry =====
  console.log("\n1. Deploying TNSRegistry...");
  const TNSRegistry = await ethers.getContractFactory("TNSRegistry");
  const registry = await TNSRegistry.deploy();
  await registry.waitForDeployment();
  console.log("TNSRegistry deployed to:", await registry.getAddress());
  
  // ===== 2. Deploy BaseRegistrarImplementation =====
  console.log("\n2. Deploying BaseRegistrarImplementation...");
  const BaseRegistrar = await ethers.getContractFactory("BaseRegistrarImplementation");
  const registrar = await BaseRegistrar.deploy(await registry.getAddress(), TRUST_NODE);
  await registrar.waitForDeployment();
  console.log("BaseRegistrarImplementation deployed to:", await registrar.getAddress());
  
  // ===== 3. Deploy DummyOracle (TRUST/USD price) =====
  console.log("\n3. Deploying DummyOracle...");
  // Set TRUST price to $1 USD (1e8 format matching Chainlink 8-decimal standard)
  const TRUST_USD_PRICE = 100000000; // $1.00 in 8-decimal format
  const DummyOracle = await ethers.getContractFactory("DummyOracle");
  const oracle = await DummyOracle.deploy(TRUST_USD_PRICE);
  await oracle.waitForDeployment();
  console.log("DummyOracle deployed to:", await oracle.getAddress());
  
  // ===== 4. Deploy StablePriceOracle =====
  console.log("\n4. Deploying StablePriceOracle...");
  // Prices in attodollars (1e-18 USD) per second
  // ENS pricing structure adapted for TNS:
  // 1 letter: not used (min 3 chars enforced by controller)
  // 2 letters: not used (min 3 chars enforced by controller)
  // 3 letters: 100 TRUST/year = 100e18 attodollars / 365.25 days
  // 4 letters: 70 TRUST/year
  // 5+ letters: 30 TRUST/year
  const SECONDS_PER_YEAR = 31557600; // 365.25 days
  const rentPrices = [
    ethers.parseEther("1000").toString(),  // 1 letter: 1000 TRUST/year (unused)
    ethers.parseEther("500").toString(),   // 2 letters: 500 TRUST/year (unused)
    ethers.parseEther("100").toString(),   // 3 letters: 100 TRUST/year
    ethers.parseEther("70").toString(),    // 4 letters: 70 TRUST/year
    ethers.parseEther("30").toString(),    // 5+ letters: 30 TRUST/year
  ];
  // Convert to attodollars per second (rentPrices are per year)
  const rentPricesPerSecond = rentPrices.map(p => (BigInt(p) / BigInt(SECONDS_PER_YEAR)).toString());
  
  const PriceOracle = await ethers.getContractFactory("StablePriceOracle");
  const priceOracle = await PriceOracle.deploy(await oracle.getAddress(), rentPricesPerSecond);
  await priceOracle.waitForDeployment();
  console.log("StablePriceOracle deployed to:", await priceOracle.getAddress());
  
  // ===== 5. Deploy ReverseRegistrar =====
  console.log("\n5. Deploying ReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("ReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(await registry.getAddress());
  await reverseRegistrar.waitForDeployment();
  console.log("ReverseRegistrar deployed to:", await reverseRegistrar.getAddress());
  
  // ===== 6. Deploy Root =====
  console.log("\n6. Deploying Root...");
  const Root = await ethers.getContractFactory("Root");
  // Root(TNS _tns, DNSSEC _oracle, address _registrar)
  // For TNS deployment: use zero address for DNSSEC oracle (not used), deployer as registrar
  const root = await Root.deploy(
    await registry.getAddress(),
    ethers.ZeroAddress,       // DNSSEC oracle (not used for TNS)
    deployer.address          // registrar fallback address
  );
  await root.waitForDeployment();
  console.log("Root deployed to:", await root.getAddress());
  
  // ===== 7. Deploy TNSRegistrarController =====
  console.log("\n7. Deploying TNSRegistrarController...");
  const Controller = await ethers.getContractFactory("TNSRegistrarController");
  const controller = await Controller.deploy(
    await registrar.getAddress(),
    await priceOracle.getAddress(),
    60,     // minCommitmentAge: 60 seconds
    86400   // maxCommitmentAge: 24 hours
  );
  await controller.waitForDeployment();
  console.log("TNSRegistrarController deployed to:", await controller.getAddress());
  
  // ===== POST-DEPLOYMENT SETUP =====
  console.log("\n=== Post-Deployment Setup ===");
  
  // 8a. Transfer root node ownership to Root contract
  console.log("8a. Transferring root node to Root contract...");
  let tx = await registry.setOwner(ROOT_NODE, await root.getAddress());
  await tx.wait();
  
  // 8b. Create .reverse TLD via Root (onlyOwner)
  console.log("8b. Creating .reverse TLD...");
  tx = await root.setSubnodeOwner(REVERSE_LABEL, deployer.address);
  await tx.wait();
  
  // 8c. Set up addr.reverse node
  console.log("8c. Creating addr.reverse node...");
  tx = await registry.setSubnodeOwner(REVERSE_NODE, ADDR_LABEL, await reverseRegistrar.getAddress());
  await tx.wait();
  
  // 8d. Transfer .trust TLD to BaseRegistrar via Root (onlyOwner)
  console.log("8d. Transferring .trust TLD to BaseRegistrar...");
  tx = await root.setSubnodeOwner(TRUST_LABEL, await registrar.getAddress());
  await tx.wait();
  
  // 8e. Add Controller to BaseRegistrar
  console.log("8e. Adding Controller to BaseRegistrar...");
  tx = await registrar.addController(await controller.getAddress());
  await tx.wait();
  
  // 8f. Set Controller on ReverseRegistrar
  console.log("8f. Setting Controller on ReverseRegistrar...");
  tx = await reverseRegistrar.setController(await controller.getAddress(), true);
  await tx.wait();
  
  // ===== SUMMARY =====
  console.log("\n========================================");
  console.log("=== TNS Deployment Complete! ===");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("TNSRegistry:              ", await registry.getAddress());
  console.log("BaseRegistrar:            ", await registrar.getAddress());
  console.log("DummyOracle:              ", await oracle.getAddress());
  console.log("StablePriceOracle:        ", await priceOracle.getAddress());
  console.log("ReverseRegistrar:         ", await reverseRegistrar.getAddress());
  console.log("Root:                     ", await root.getAddress());
  console.log("TNSRegistrarController:   ", await controller.getAddress());
  console.log("\nTRUST_NODE:             ", TRUST_NODE);
  
  // Verify deployment
  console.log("\n=== Verification ===");
  const trustOwner = await registry.owner(TRUST_NODE);
  console.log(".trust TLD owner:", trustOwner);
  console.log("Expected (BaseRegistrar):", await registrar.getAddress());
  console.log("Match:", trustOwner === await registrar.getAddress());
  
  const rootOwner = await registry.owner(ROOT_NODE);
  console.log("Root node owner:", rootOwner);
  console.log("Expected (Root contract):", await root.getAddress());
  console.log("Match:", rootOwner === await root.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
