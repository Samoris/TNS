import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PaymentForwarder with account:", deployer.address);
  
  const TNS_REGISTRY = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";
  
  const PaymentForwarder = await ethers.getContractFactory("PaymentForwarder");
  const forwarder = await PaymentForwarder.deploy(TNS_REGISTRY);
  await forwarder.waitForDeployment();
  
  const address = await forwarder.getAddress();
  console.log("PaymentForwarder deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
