import { ethers } from "hardhat";

/**
 * TNS Deployment Script - Full ENS Port
 * 
 * Deployment Order:
 * 1. TNSRegistry
 * 2. BaseRegistrarImplementation
 * 3. StablePriceOracle
 * 4. ReverseRegistrar
 * 5. Resolver
 * 6. TNSRegistrarController
 * 7. Post-deployment setup
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
  
  const TREASURY = process.env.TREASURY_ADDRESS || "0x629A5386F73283F80847154d16E359192a891f86";
  
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
  
  // ===== 3. Deploy StablePriceOracle =====
  console.log("\n3. Deploying StablePriceOracle...");
  const rentPrices = [
    ethers.parseEther("1000"),  // 1 letter: 1000 TRUST/year
    ethers.parseEther("500"),   // 2 letters: 500 TRUST/year
    ethers.parseEther("100"),   // 3 letters: 100 TRUST/year
    ethers.parseEther("70"),    // 4 letters: 70 TRUST/year
    ethers.parseEther("30"),    // 5+ letters: 30 TRUST/year
  ];
  const PriceOracle = await ethers.getContractFactory("StablePriceOracle");
  const priceOracle = await PriceOracle.deploy(rentPrices);
  await priceOracle.waitForDeployment();
  console.log("StablePriceOracle deployed to:", await priceOracle.getAddress());
  
  // ===== 4. Deploy ReverseRegistrar =====
  console.log("\n4. Deploying ReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("ReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(await registry.getAddress());
  await reverseRegistrar.waitForDeployment();
  console.log("ReverseRegistrar deployed to:", await reverseRegistrar.getAddress());
  
  // ===== 5. Deploy Resolver =====
  console.log("\n5. Deploying Resolver...");
  const Resolver = await ethers.getContractFactory("Resolver");
  // Pass zero addresses for now, will update after controller deployment
  const resolver = await Resolver.deploy(
    await registry.getAddress(),
    ethers.ZeroAddress, // trustedController - will update later
    await reverseRegistrar.getAddress()
  );
  await resolver.waitForDeployment();
  console.log("Resolver deployed to:", await resolver.getAddress());
  
  // ===== 6. Deploy TNSRegistrarController =====
  console.log("\n6. Deploying TNSRegistrarController...");
  const Controller = await ethers.getContractFactory("TNSRegistrarController");
  const controller = await Controller.deploy(
    await registrar.getAddress(),
    await priceOracle.getAddress(),
    60,     // minCommitmentAge: 60 seconds
    86400,  // maxCommitmentAge: 24 hours
    await reverseRegistrar.getAddress(),
    ethers.ZeroAddress, // nameWrapper: not used
    await registry.getAddress(),
    TREASURY
  );
  await controller.waitForDeployment();
  console.log("TNSRegistrarController deployed to:", await controller.getAddress());
  
  // ===== POST-DEPLOYMENT SETUP =====
  console.log("\n=== Post-Deployment Setup ===");
  
  // 7a. Set up .reverse TLD
  console.log("7a. Creating .reverse TLD...");
  let tx = await registry.setSubnodeOwner(ROOT_NODE, REVERSE_LABEL, deployer.address);
  await tx.wait();
  
  // 7b. Set up addr.reverse node
  console.log("7b. Creating addr.reverse node...");
  tx = await registry.setSubnodeOwner(REVERSE_NODE, ADDR_LABEL, await reverseRegistrar.getAddress());
  await tx.wait();
  
  // 7c. Transfer .trust TLD to BaseRegistrar
  console.log("7c. Transferring .trust TLD to BaseRegistrar...");
  tx = await registry.setSubnodeOwner(ROOT_NODE, TRUST_LABEL, await registrar.getAddress());
  await tx.wait();
  
  // 7d. Add Controller to BaseRegistrar
  console.log("7d. Adding Controller to BaseRegistrar...");
  tx = await registrar.addController(await controller.getAddress());
  await tx.wait();
  
  // 7e. Set Controller on ReverseRegistrar
  console.log("7e. Setting Controller on ReverseRegistrar...");
  tx = await reverseRegistrar.setController(await controller.getAddress(), true);
  await tx.wait();
  
  // 7f. Set default resolver on ReverseRegistrar
  console.log("7f. Setting default resolver on ReverseRegistrar...");
  tx = await reverseRegistrar.setDefaultResolver(await resolver.getAddress());
  await tx.wait();
  
  // 7g. Update trusted controller in Resolver
  console.log("7g. Updating trusted controller in Resolver...");
  tx = await resolver.setTrustedController(await controller.getAddress());
  await tx.wait();
  
  // 7h. Set resolver for .trust TLD
  console.log("7h. Setting resolver for .trust TLD...");
  tx = await registrar.setResolver(await resolver.getAddress());
  await tx.wait();
  
  // ===== SUMMARY =====
  console.log("\n========================================");
  console.log("=== TNS Deployment Complete! ===");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("TNSRegistry:           ", await registry.getAddress());
  console.log("BaseRegistrar:         ", await registrar.getAddress());
  console.log("StablePriceOracle:     ", await priceOracle.getAddress());
  console.log("ReverseRegistrar:      ", await reverseRegistrar.getAddress());
  console.log("Resolver:              ", await resolver.getAddress());
  console.log("TNSRegistrarController:", await controller.getAddress());
  console.log("\nTreasury:             ", TREASURY);
  console.log("TRUST_NODE:           ", TRUST_NODE);
  
  // Verify deployment
  console.log("\n=== Verification ===");
  const trustOwner = await registry.owner(TRUST_NODE);
  console.log(".trust TLD owner:", trustOwner);
  console.log("Expected (BaseRegistrar):", await registrar.getAddress());
  console.log("Match:", trustOwner === await registrar.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
