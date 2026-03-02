import { ethers } from "hardhat";

/**
 * TNS Deployment Script - Full ENS Port
 * Only change from ENS: .eth -> .trust
 * 
 * Deployment Order:
 * 1. TNSRegistry
 * 2. BaseRegistrarImplementation
 * 3. ExponentialPremiumPriceOracle (with USD oracle)
 * 4. ReverseRegistrar
 * 5. Resolver
 * 6. TNSRegistrarController
 * 7. Post-deployment setup
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
  
  const USD_ORACLE = process.env.USD_ORACLE_ADDRESS || ethers.ZeroAddress;
  
  const TRUST_LABEL = ethers.keccak256(ethers.toUtf8Bytes("trust"));
  const ROOT_NODE = ethers.ZeroHash;
  const TRUST_NODE = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [ROOT_NODE, TRUST_LABEL]));
  
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
  
  // ===== 3. Deploy ExponentialPremiumPriceOracle =====
  console.log("\n3. Deploying ExponentialPremiumPriceOracle...");
  const rentPrices = [
    ethers.parseEther("0"),     // 1 letter: unused (min 3 chars)
    ethers.parseEther("0"),     // 2 letters: unused (min 3 chars)
    ethers.parseUnits("640", 18),   // 3 letters: $640/year in attodollars
    ethers.parseUnits("160", 18),   // 4 letters: $160/year in attodollars
    ethers.parseUnits("5", 18),     // 5+ letters: $5/year in attodollars
  ];
  const startPremium = ethers.parseUnits("100000000", 18); // ~$100M USD start premium
  const totalDays = 21; // 21 days of premium decay
  const PriceOracle = await ethers.getContractFactory("ExponentialPremiumPriceOracle");
  const priceOracle = await PriceOracle.deploy(USD_ORACLE, rentPrices, startPremium, totalDays);
  await priceOracle.waitForDeployment();
  console.log("ExponentialPremiumPriceOracle deployed to:", await priceOracle.getAddress());
  
  // ===== 4. Deploy ReverseRegistrar =====
  console.log("\n4. Deploying ReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("ReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(await registry.getAddress());
  await reverseRegistrar.waitForDeployment();
  console.log("ReverseRegistrar deployed to:", await reverseRegistrar.getAddress());
  
  // ===== 5. Deploy NameWrapper =====
  console.log("\n5. Deploying NameWrapper...");
  const NameWrapper = await ethers.getContractFactory("NameWrapper");
  const nameWrapper = await NameWrapper.deploy(
    await registry.getAddress(),
    await registrar.getAddress(),
    ""
  );
  await nameWrapper.waitForDeployment();
  console.log("NameWrapper deployed to:", await nameWrapper.getAddress());
  
  // ===== 6. Deploy Resolver =====
  console.log("\n6. Deploying Resolver...");
  const Resolver = await ethers.getContractFactory("Resolver");
  const resolver = await Resolver.deploy(
    await registry.getAddress(),
    ethers.ZeroAddress,
    await reverseRegistrar.getAddress()
  );
  await resolver.waitForDeployment();
  console.log("Resolver deployed to:", await resolver.getAddress());
  
  // ===== 7. Deploy TNSRegistrarController =====
  console.log("\n7. Deploying TNSRegistrarController...");
  const Controller = await ethers.getContractFactory("TNSRegistrarController");
  const controller = await Controller.deploy(
    await registrar.getAddress(),
    await priceOracle.getAddress(),
    60,     // minCommitmentAge: 60 seconds
    86400,  // maxCommitmentAge: 24 hours
    await reverseRegistrar.getAddress(),
    await nameWrapper.getAddress(),
    await registry.getAddress()
  );
  await controller.waitForDeployment();
  console.log("TNSRegistrarController deployed to:", await controller.getAddress());
  
  // ===== POST-DEPLOYMENT SETUP =====
  console.log("\n=== Post-Deployment Setup ===");
  
  console.log("8a. Creating .reverse TLD...");
  let tx = await registry.setSubnodeOwner(ROOT_NODE, REVERSE_LABEL, deployer.address);
  await tx.wait();
  
  console.log("8b. Creating addr.reverse node...");
  tx = await registry.setSubnodeOwner(REVERSE_NODE, ADDR_LABEL, await reverseRegistrar.getAddress());
  await tx.wait();
  
  console.log("8c. Transferring .trust TLD to BaseRegistrar...");
  tx = await registry.setSubnodeOwner(ROOT_NODE, TRUST_LABEL, await registrar.getAddress());
  await tx.wait();
  
  console.log("8d. Adding Controller to BaseRegistrar...");
  tx = await registrar.addController(await controller.getAddress());
  await tx.wait();
  
  console.log("8e. Adding Controller to NameWrapper...");
  tx = await nameWrapper.setController(await controller.getAddress(), true);
  await tx.wait();
  
  console.log("8f. Adding NameWrapper to BaseRegistrar as controller...");
  tx = await registrar.addController(await nameWrapper.getAddress());
  await tx.wait();
  
  console.log("8g. Setting Controller on ReverseRegistrar...");
  tx = await reverseRegistrar.setController(await controller.getAddress(), true);
  await tx.wait();
  
  console.log("8h. Setting default resolver on ReverseRegistrar...");
  tx = await reverseRegistrar.setDefaultResolver(await resolver.getAddress());
  await tx.wait();
  
  console.log("8i. Updating trusted controller in Resolver...");
  tx = await resolver.setTrustedController(await controller.getAddress());
  await tx.wait();
  
  console.log("8j. Setting resolver for .trust TLD...");
  tx = await registrar.setResolver(await resolver.getAddress());
  await tx.wait();
  
  // ===== SUMMARY =====
  console.log("\n========================================");
  console.log("=== TNS Deployment Complete! ===");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("TNSRegistry:                    ", await registry.getAddress());
  console.log("BaseRegistrar:                  ", await registrar.getAddress());
  console.log("ExponentialPremiumPriceOracle:   ", await priceOracle.getAddress());
  console.log("NameWrapper:                    ", await nameWrapper.getAddress());
  console.log("ReverseRegistrar:               ", await reverseRegistrar.getAddress());
  console.log("Resolver:                       ", await resolver.getAddress());
  console.log("TNSRegistrarController:         ", await controller.getAddress());
  console.log("\nTRUST_NODE:                   ", TRUST_NODE);
  
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
