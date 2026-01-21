import { ethers } from "hardhat";

/**
 * Script to verify TNS deployment
 */

async function main() {
  // Replace with your deployed contract addresses
  const REGISTRY_ADDRESS = process.env.TNS_REGISTRY || "";
  const REGISTRAR_ADDRESS = process.env.TNS_REGISTRAR || "";
  const CONTROLLER_ADDRESS = process.env.TNS_CONTROLLER || "";
  const RESOLVER_ADDRESS = process.env.TNS_RESOLVER || "";
  
  if (!REGISTRY_ADDRESS) {
    console.log("Please set contract addresses in environment variables:");
    console.log("  TNS_REGISTRY=0x...");
    console.log("  TNS_REGISTRAR=0x...");
    console.log("  TNS_CONTROLLER=0x...");
    console.log("  TNS_RESOLVER=0x...");
    return;
  }

  console.log("=== TNS Deployment Verification ===\n");

  // Calculate .trust node
  const TRUST_LABEL = ethers.keccak256(ethers.toUtf8Bytes("trust"));
  const ROOT_NODE = ethers.ZeroHash;
  const TRUST_NODE = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [ROOT_NODE, TRUST_LABEL]));

  console.log("TRUST_NODE:", TRUST_NODE);

  // Connect to contracts
  const registry = await ethers.getContractAt("TNSRegistry", REGISTRY_ADDRESS);
  const registrar = await ethers.getContractAt("BaseRegistrarImplementation", REGISTRAR_ADDRESS);
  const controller = await ethers.getContractAt("TNSRegistrarController", CONTROLLER_ADDRESS);

  // Verify .trust TLD ownership
  const trustOwner = await registry.owner(TRUST_NODE);
  console.log("\n1. .trust TLD owner:", trustOwner);
  console.log("   Expected (Registrar):", REGISTRAR_ADDRESS);
  console.log("   Status:", trustOwner.toLowerCase() === REGISTRAR_ADDRESS.toLowerCase() ? "✅ PASS" : "❌ FAIL");

  // Verify controller is authorized
  const isController = await registrar.controllers(CONTROLLER_ADDRESS);
  console.log("\n2. Controller authorized:", isController);
  console.log("   Status:", isController ? "✅ PASS" : "❌ FAIL");

  // Test availability check
  const testName = "test123456789";
  const isAvailable = await controller.available(testName);
  console.log("\n3. Test domain available:", testName, "=", isAvailable);

  // Get pricing
  const oneYear = 365 * 24 * 60 * 60;
  const price = await controller.rentPrice("example", oneYear);
  console.log("\n4. Price for 'example' (1 year):");
  console.log("   Base:", ethers.formatEther(price.base), "TRUST");
  console.log("   Premium:", ethers.formatEther(price.premium), "TRUST");

  console.log("\n=== Verification Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
