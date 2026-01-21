import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const REVERSE_REGISTRAR_ADDRESS = "0x5140b65d566DA2d1298fCFE75eA972850bC2E365";
const RESOLVER_ADDRESS = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";

const REVERSE_REGISTRAR_ABI = [
  "function setDefaultResolver(address resolver) external",
  "function defaultResolver() external view returns (address)",
  "function owner() external view returns (address)"
];

const RESOLVER_ABI = [
  "function setTrustedReverseRegistrar(address _reverseRegistrar) external",
  "function trustedReverseRegistrar() external view returns (address)",
  "function owner() external view returns (address)"
];

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider("https://intuition.calderachain.xyz");
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Configuring contracts with wallet:", wallet.address);

  const reverseRegistrar = new ethers.Contract(REVERSE_REGISTRAR_ADDRESS, REVERSE_REGISTRAR_ABI, wallet);
  const resolver = new ethers.Contract(RESOLVER_ADDRESS, RESOLVER_ABI, wallet);

  // Check current configuration
  console.log("\n--- Current Configuration ---");
  
  const currentDefaultResolver = await reverseRegistrar.defaultResolver();
  console.log("ReverseRegistrar.defaultResolver:", currentDefaultResolver);
  
  const currentTrustedReverseRegistrar = await resolver.trustedReverseRegistrar();
  console.log("Resolver.trustedReverseRegistrar:", currentTrustedReverseRegistrar);

  // Check ownership
  const reverseRegistrarOwner = await reverseRegistrar.owner();
  const resolverOwner = await resolver.owner();
  console.log("\nReverseRegistrar owner:", reverseRegistrarOwner);
  console.log("Resolver owner:", resolverOwner);
  console.log("Our wallet:", wallet.address);

  // Configure ReverseRegistrar.defaultResolver if needed
  if (currentDefaultResolver.toLowerCase() !== RESOLVER_ADDRESS.toLowerCase()) {
    console.log("\n--- Setting ReverseRegistrar.defaultResolver ---");
    const tx1 = await reverseRegistrar.setDefaultResolver(RESOLVER_ADDRESS);
    console.log("Transaction sent:", tx1.hash);
    await tx1.wait();
    console.log("ReverseRegistrar.defaultResolver set to:", RESOLVER_ADDRESS);
  } else {
    console.log("\nReverseRegistrar.defaultResolver already configured correctly");
  }

  // Configure Resolver.trustedReverseRegistrar if needed
  if (currentTrustedReverseRegistrar.toLowerCase() !== REVERSE_REGISTRAR_ADDRESS.toLowerCase()) {
    console.log("\n--- Setting Resolver.trustedReverseRegistrar ---");
    const tx2 = await resolver.setTrustedReverseRegistrar(REVERSE_REGISTRAR_ADDRESS);
    console.log("Transaction sent:", tx2.hash);
    await tx2.wait();
    console.log("Resolver.trustedReverseRegistrar set to:", REVERSE_REGISTRAR_ADDRESS);
  } else {
    console.log("\nResolver.trustedReverseRegistrar already configured correctly");
  }

  // Verify final configuration
  console.log("\n--- Final Configuration ---");
  const finalDefaultResolver = await reverseRegistrar.defaultResolver();
  const finalTrustedReverseRegistrar = await resolver.trustedReverseRegistrar();
  console.log("ReverseRegistrar.defaultResolver:", finalDefaultResolver);
  console.log("Resolver.trustedReverseRegistrar:", finalTrustedReverseRegistrar);

  console.log("\n✅ Configuration complete! Primary domain setting should now work.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
