import { ethers } from "hardhat";

const BASE_REGISTRAR = "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629";
const STABLE_PRICE_ORACLE = "0x77C5F276dd8f7321E42580AC53E73859C080A0f2";
const REVERSE_REGISTRAR = "0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080";
const RESOLVER = "0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b";
const OLD_CONTROLLER = "0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80";

const REGISTRAR_ABI = [
  "function addController(address controller) external",
  "function removeController(address controller) external",
  "function controllers(address) view returns (bool)",
];

const REVERSE_ABI = [
  "function setController(address controller, bool enabled) external",
];

const RESOLVER_ABI = [
  "function setTrustedController(address _controller) external",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying Controller with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  console.log("1. Deploying new ETHRegistrarController (valid >= 3 chars)...");
  const Controller = await ethers.getContractFactory("ETHRegistrarController");
  const controller = await Controller.deploy(BASE_REGISTRAR, STABLE_PRICE_ORACLE);
  await controller.waitForDeployment();
  const newAddr = await controller.getAddress();
  console.log("New Controller deployed to:", newAddr);

  const registrar = new ethers.Contract(BASE_REGISTRAR, REGISTRAR_ABI, deployer);
  const reverseRegistrar = new ethers.Contract(REVERSE_REGISTRAR, REVERSE_ABI, deployer);
  const resolver = new ethers.Contract(RESOLVER, RESOLVER_ABI, deployer);

  console.log("\n2. Adding new controller to BaseRegistrar...");
  let tx = await registrar.addController(newAddr);
  await tx.wait();
  console.log("Done.");

  console.log("3. Removing old controller from BaseRegistrar...");
  tx = await registrar.removeController(OLD_CONTROLLER);
  await tx.wait();
  console.log("Done.");

  console.log("4. Setting new controller on ReverseRegistrar...");
  tx = await reverseRegistrar.setController(newAddr, true);
  await tx.wait();
  console.log("Done.");

  console.log("5. Disabling old controller on ReverseRegistrar...");
  tx = await reverseRegistrar.setController(OLD_CONTROLLER, false);
  await tx.wait();
  console.log("Done.");

  console.log("6. Updating trusted controller on Resolver...");
  tx = await resolver.setTrustedController(newAddr);
  await tx.wait();
  console.log("Done.");

  console.log("\n=== Verification ===");
  const isNew = await registrar.controllers(newAddr);
  const isOld = await registrar.controllers(OLD_CONTROLLER);
  console.log("New controller registered:", isNew);
  console.log("Old controller removed:", !isOld);

  console.log("\n========================================");
  console.log("New Controller:", newAddr);
  console.log("Old Controller:", OLD_CONTROLLER, "(removed)");
  console.log("valid() now accepts names >= 3 characters");
  console.log("========================================");
  console.log("\nBalance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
