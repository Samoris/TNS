import { ethers } from "hardhat";

const BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
const STABLE_PRICE_ORACLE = "0x6F258639D183Fb7955B93d086FA9300eED79383A";
const REVERSE_REGISTRAR = "0x78Cd4f5149060De05a84040283812b0c056972eD";
const RESOLVER = "0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5";
const OLD_CONTROLLER = "0x8A5F965e8D5e6330f99B81674670aC6f643F1A8C";
const TREASURY = "0x629A5386F73283F80847154d16E359192a891f86";

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

  console.log("1. Deploying new TNSRegistrarController (valid >= 3 chars)...");
  const Controller = await ethers.getContractFactory("TNSRegistrarController");
  const controller = await Controller.deploy(BASE_REGISTRAR, STABLE_PRICE_ORACLE, TREASURY);
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
