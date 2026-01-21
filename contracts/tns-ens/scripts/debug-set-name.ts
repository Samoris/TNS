import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const REVERSE_REGISTRAR_ADDRESS = "0x5140b65d566DA2d1298fCFE75eA972850bC2E365";
const RESOLVER_ADDRESS = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";
const TNS_REGISTRY_ADDRESS = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";

const TEST_USER = "0xE9bFe128b7F0F7486c206Aa87a2C2E796fc77BcD";
const TEST_DOMAIN = "samoris.trust";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://intuition.calderachain.xyz");
  
  console.log("Debugging setName for user:", TEST_USER);
  console.log("Domain:", TEST_DOMAIN);

  // Check the reverse node for this user
  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
  
  // Calculate the user's reverse node (sha3HexAddress)
  const addrLower = TEST_USER.toLowerCase().replace("0x", "");
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(addrLower));
  const userReverseNode = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [ADDR_REVERSE_NODE, labelHash]));
  
  console.log("\nUser address (lowercase, no 0x):", addrLower);
  console.log("Label hash:", labelHash);
  console.log("User's reverse node:", userReverseNode);

  // Check registry for user's reverse node
  const registryAbi = [
    "function owner(bytes32 node) view returns (address)",
    "function resolver(bytes32 node) view returns (address)"
  ];
  const registry = new ethers.Contract(TNS_REGISTRY_ADDRESS, registryAbi, provider);

  const nodeOwner = await registry.owner(userReverseNode);
  const nodeResolver = await registry.resolver(userReverseNode);
  
  console.log("\nUser's reverse node owner:", nodeOwner);
  console.log("User's reverse node resolver:", nodeResolver);

  // Check resolver's name function
  const resolverAbi = [
    "function name(bytes32 node) view returns (string)",
    "function trustedReverseRegistrar() view returns (address)",
    "function trustedController() view returns (address)"
  ];
  const resolver = new ethers.Contract(RESOLVER_ADDRESS, resolverAbi, provider);

  try {
    const currentName = await resolver.name(userReverseNode);
    console.log("\nCurrent name in resolver:", currentName || "(empty)");
  } catch (e: any) {
    console.log("\nError getting name from resolver:", e.message);
  }

  const trustedReverseRegistrar = await resolver.trustedReverseRegistrar();
  const trustedController = await resolver.trustedController();
  console.log("\nResolver.trustedReverseRegistrar:", trustedReverseRegistrar);
  console.log("Resolver.trustedController:", trustedController);

  // Check ReverseRegistrar
  const reverseAbi = [
    "function defaultResolver() view returns (address)",
    "function controllers(address) view returns (bool)",
    "function owner() view returns (address)"
  ];
  const reverseRegistrar = new ethers.Contract(REVERSE_REGISTRAR_ADDRESS, reverseAbi, provider);

  const defaultResolver = await reverseRegistrar.defaultResolver();
  const owner = await reverseRegistrar.owner();
  
  console.log("\nReverseRegistrar.defaultResolver:", defaultResolver);
  console.log("ReverseRegistrar.owner:", owner);

  // Try to simulate the setName call
  console.log("\n--- Simulating setName call ---");
  
  const setNameAbi = ["function setName(string name) returns (bytes32)"];
  const reverseContract = new ethers.Contract(REVERSE_REGISTRAR_ADDRESS, setNameAbi, provider);
  
  try {
    // Encode the call
    const callData = reverseContract.interface.encodeFunctionData("setName", [TEST_DOMAIN]);
    console.log("Encoded call data:", callData);
    
    // Simulate the call
    const result = await provider.call({
      to: REVERSE_REGISTRAR_ADDRESS,
      from: TEST_USER,
      data: callData
    });
    console.log("Simulation result:", result);
  } catch (e: any) {
    console.log("Simulation error:", e.message);
    if (e.data) {
      console.log("Error data:", e.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
