import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const TNS_REGISTRY_ADDRESS = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";
const REVERSE_REGISTRAR_ADDRESS = "0x5140b65d566DA2d1298fCFE75eA972850bC2E365";

const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";

const TNS_REGISTRY_ABI = [
  "function owner(bytes32 node) external view returns (address)",
  "function resolver(bytes32 node) external view returns (address)",
  "function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32)",
  "function setOwner(bytes32 node, address owner) external"
];

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider("https://intuition.calderachain.xyz");
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Checking reverse node ownership with wallet:", wallet.address);

  const registry = new ethers.Contract(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, wallet);

  // Check who owns the addr.reverse node
  const reverseNodeOwner = await registry.owner(ADDR_REVERSE_NODE);
  console.log("\naddr.reverse node owner:", reverseNodeOwner);
  console.log("ReverseRegistrar address:", REVERSE_REGISTRAR_ADDRESS);
  console.log("Our wallet:", wallet.address);

  if (reverseNodeOwner === ethers.ZeroAddress) {
    console.log("\n⚠️ addr.reverse node has no owner! Need to set it up.");
    
    // First, create the 'reverse' subnode under root
    const reverseLabel = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
    const rootNode = ethers.ZeroHash;
    
    console.log("\nSetting up reverse node...");
    console.log("Root node:", rootNode);
    console.log("Reverse label:", reverseLabel);
    
    // Check root owner
    const rootOwner = await registry.owner(rootNode);
    console.log("Root node owner:", rootOwner);
    
    if (rootOwner.toLowerCase() === wallet.address.toLowerCase()) {
      // Create 'reverse' subnode
      console.log("\nCreating 'reverse' subnode under root...");
      const tx1 = await registry.setSubnodeOwner(rootNode, reverseLabel, wallet.address);
      console.log("Transaction:", tx1.hash);
      await tx1.wait();
      console.log("'reverse' subnode created");
      
      // Now create 'addr' subnode under 'reverse'
      const reverseNode = ethers.namehash("reverse");
      const addrLabel = ethers.keccak256(ethers.toUtf8Bytes("addr"));
      
      console.log("\nCreating 'addr' subnode under 'reverse'...");
      console.log("Reverse node:", reverseNode);
      console.log("Addr label:", addrLabel);
      
      const tx2 = await registry.setSubnodeOwner(reverseNode, addrLabel, REVERSE_REGISTRAR_ADDRESS);
      console.log("Transaction:", tx2.hash);
      await tx2.wait();
      console.log("'addr.reverse' subnode created and owned by ReverseRegistrar");
    } else {
      console.log("Cannot set up - we don't own the root node");
    }
  } else if (reverseNodeOwner.toLowerCase() !== REVERSE_REGISTRAR_ADDRESS.toLowerCase()) {
    console.log("\n⚠️ addr.reverse node is not owned by ReverseRegistrar!");
    console.log("Current owner:", reverseNodeOwner);
    
    if (reverseNodeOwner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("\nWe own the node - transferring to ReverseRegistrar...");
      const tx = await registry.setOwner(ADDR_REVERSE_NODE, REVERSE_REGISTRAR_ADDRESS);
      console.log("Transaction:", tx.hash);
      await tx.wait();
      console.log("Ownership transferred to ReverseRegistrar");
    }
  } else {
    console.log("\n✅ addr.reverse node is correctly owned by ReverseRegistrar");
  }

  // Final check
  const finalOwner = await registry.owner(ADDR_REVERSE_NODE);
  console.log("\nFinal addr.reverse node owner:", finalOwner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
