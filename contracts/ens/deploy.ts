// TNS ENS Fork Deployment Script
// Deploy order: Registry → BaseRegistrar → PriceOracle → Controller → Resolver → ReverseRegistrar → PaymentForwarder
// Note: TRUST is a native token (like ETH), not an ERC-20 token

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "TRUST");

  // Configuration
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "0x629A5386F73283F80847154d16E359192a891f86";
  const BASE_URI = process.env.BASE_URI || "https://tns.intuition.box/api/metadata/";

  console.log("Treasury address:", TREASURY_ADDRESS);

  // Calculate .trust namehash
  const TRUST_LABEL = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("trust"));
  const TRUST_NODE = ethers.utils.keccak256(
    ethers.utils.solidityPack(["bytes32", "bytes32"], [ethers.constants.HashZero, TRUST_LABEL])
  );

  console.log("Trust label hash:", TRUST_LABEL);
  console.log("Trust node (baseNode):", TRUST_NODE);

  // 1. Deploy TNSRegistry
  console.log("\n1. Deploying TNSRegistry...");
  const TNSRegistry = await ethers.getContractFactory("TNSRegistry");
  const registry = await TNSRegistry.deploy();
  await registry.deployed();
  console.log("TNSRegistry deployed to:", registry.address);

  // 2. Deploy TNSBaseRegistrar
  console.log("\n2. Deploying TNSBaseRegistrar...");
  const TNSBaseRegistrar = await ethers.getContractFactory("TNSBaseRegistrar");
  const baseRegistrar = await TNSBaseRegistrar.deploy(registry.address, TRUST_NODE);
  await baseRegistrar.deployed();
  console.log("TNSBaseRegistrar deployed to:", baseRegistrar.address);

  // 3. Deploy TNSPriceOracle
  console.log("\n3. Deploying TNSPriceOracle...");
  const TNSPriceOracle = await ethers.getContractFactory("TNSPriceOracle");
  const priceOracle = await TNSPriceOracle.deploy();
  await priceOracle.deployed();
  console.log("TNSPriceOracle deployed to:", priceOracle.address);

  // 4. Deploy TNSController (native TRUST payments, no ERC-20)
  console.log("\n4. Deploying TNSController...");
  const TNSController = await ethers.getContractFactory("TNSController");
  const controller = await TNSController.deploy(
    baseRegistrar.address,
    priceOracle.address,
    TREASURY_ADDRESS
  );
  await controller.deployed();
  console.log("TNSController deployed to:", controller.address);

  // 5. Deploy TNSReverseRegistrar
  console.log("\n5. Deploying TNSReverseRegistrar...");
  const TNSReverseRegistrar = await ethers.getContractFactory("TNSReverseRegistrar");
  const reverseRegistrar = await TNSReverseRegistrar.deploy(registry.address);
  await reverseRegistrar.deployed();
  console.log("TNSReverseRegistrar deployed to:", reverseRegistrar.address);

  // 6. Deploy TNSResolver
  console.log("\n6. Deploying TNSResolver...");
  const TNSResolver = await ethers.getContractFactory("TNSResolver");
  const resolver = await TNSResolver.deploy(
    registry.address,
    baseRegistrar.address,
    controller.address,
    reverseRegistrar.address
  );
  await resolver.deployed();
  console.log("TNSResolver deployed to:", resolver.address);

  // 7. Deploy TNSPaymentForwarder (native TRUST payments, no ERC-20)
  console.log("\n7. Deploying TNSPaymentForwarder...");
  const TNSPaymentForwarder = await ethers.getContractFactory("TNSPaymentForwarder");
  const paymentForwarder = await TNSPaymentForwarder.deploy(
    registry.address,
    resolver.address,
    TRUST_NODE
  );
  await paymentForwarder.deployed();
  console.log("TNSPaymentForwarder deployed to:", paymentForwarder.address);

  // Post-deployment setup
  console.log("\n--- Post-Deployment Setup ---");

  // Calculate reverse node hashes
  const REVERSE_LABEL = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("reverse"));
  const ADDR_LABEL = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("addr"));
  const REVERSE_NODE = ethers.utils.keccak256(
    ethers.utils.solidityPack(["bytes32", "bytes32"], [ethers.constants.HashZero, REVERSE_LABEL])
  );

  // Set up reverse hierarchy first
  console.log("\n8. Setting up reverse resolution hierarchy...");
  
  // Create .reverse TLD
  const txReverse1 = await registry.setSubnodeOwner(ethers.constants.HashZero, REVERSE_LABEL, deployer.address);
  await txReverse1.wait();
  console.log(".reverse TLD created");
  
  // Create addr.reverse node and assign to ReverseRegistrar
  const txReverse2 = await registry.setSubnodeOwner(REVERSE_NODE, ADDR_LABEL, reverseRegistrar.address);
  await txReverse2.wait();
  console.log("addr.reverse assigned to ReverseRegistrar");

  // Transfer .trust TLD to BaseRegistrar
  console.log("\n9. Setting .trust TLD ownership to BaseRegistrar...");
  const tx1 = await registry.setSubnodeOwner(ethers.constants.HashZero, TRUST_LABEL, baseRegistrar.address);
  await tx1.wait();
  console.log("TLD ownership transferred");

  // Add Controller as authorized controller
  console.log("\n10. Adding Controller to BaseRegistrar...");
  const tx2 = await baseRegistrar.addController(controller.address);
  await tx2.wait();
  console.log("Controller added");

  // Add Controller to ReverseRegistrar
  console.log("\n11. Adding Controller to ReverseRegistrar...");
  const txController = await reverseRegistrar.setController(controller.address, true);
  await txController.wait();
  console.log("Controller added to ReverseRegistrar");

  // Set default resolver on ReverseRegistrar
  console.log("\n12. Setting default resolver on ReverseRegistrar...");
  const tx3 = await reverseRegistrar.setDefaultResolver(resolver.address);
  await tx3.wait();
  console.log("Default resolver set");

  // Set base URI for NFT metadata
  console.log("\n13. Setting base URI on BaseRegistrar...");
  const tx4 = await baseRegistrar.setBaseURI(BASE_URI);
  await tx4.wait();
  console.log("Base URI set");

  // Set resolver on .trust TLD
  console.log("\n14. Setting resolver on .trust TLD...");
  const tx5 = await baseRegistrar.setResolver(resolver.address);
  await tx5.wait();
  console.log("Resolver set on TLD");

  // Summary
  console.log("\n========== DEPLOYMENT COMPLETE ==========");
  console.log("TNSRegistry:", registry.address);
  console.log("TNSBaseRegistrar:", baseRegistrar.address);
  console.log("TNSPriceOracle:", priceOracle.address);
  console.log("TNSController:", controller.address);
  console.log("TNSReverseRegistrar:", reverseRegistrar.address);
  console.log("TNSResolver:", resolver.address);
  console.log("TNSPaymentForwarder:", paymentForwarder.address);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("==========================================");

  // Return addresses for verification
  return {
    registry: registry.address,
    baseRegistrar: baseRegistrar.address,
    priceOracle: priceOracle.address,
    controller: controller.address,
    reverseRegistrar: reverseRegistrar.address,
    resolver: resolver.address,
    paymentForwarder: paymentForwarder.address,
    trustNode: TRUST_NODE,
  };
}

main()
  .then((addresses) => {
    console.log("\nContract addresses for .env:");
    console.log(`TNS_REGISTRY_ADDRESS=${addresses.registry}`);
    console.log(`TNS_BASE_REGISTRAR_ADDRESS=${addresses.baseRegistrar}`);
    console.log(`TNS_PRICE_ORACLE_ADDRESS=${addresses.priceOracle}`);
    console.log(`TNS_CONTROLLER_ADDRESS=${addresses.controller}`);
    console.log(`TNS_REVERSE_REGISTRAR_ADDRESS=${addresses.reverseRegistrar}`);
    console.log(`TNS_RESOLVER_ADDRESS=${addresses.resolver}`);
    console.log(`TNS_PAYMENT_FORWARDER_ADDRESS=${addresses.paymentForwarder}`);
    console.log(`TNS_TRUST_NODE=${addresses.trustNode}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
