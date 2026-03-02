import { ethers } from "hardhat";

const NEW_REGISTRY = "0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99";
const NEW_CONTROLLER = "0xeA6469B9B917F06499807509ED2d1223cA85E1f9";
const NEW_REVERSE_REGISTRAR = "0x78Cd4f5149060De05a84040283812b0c056972eD";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Resolver + PaymentForwarder with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  console.log("1. Deploying Resolver...");
  const Resolver = await ethers.getContractFactory("Resolver");
  const resolver = await Resolver.deploy(NEW_REGISTRY, NEW_CONTROLLER, NEW_REVERSE_REGISTRAR);
  await resolver.waitForDeployment();
  const resolverAddr = await resolver.getAddress();
  console.log("Resolver deployed to:", resolverAddr);

  console.log("\n2. Setting default resolver on ReverseRegistrar...");
  const reverseRegistrar = await ethers.getContractAt("ReverseRegistrar", NEW_REVERSE_REGISTRAR);
  const tx = await reverseRegistrar.setDefaultResolver(resolverAddr);
  await tx.wait();
  console.log("Default resolver set on ReverseRegistrar");

  console.log("\n3. Deploying PaymentForwarder...");
  const PaymentForwarder = await ethers.getContractFactory("PaymentForwarder");
  const forwarder = await PaymentForwarder.deploy(NEW_REGISTRY);
  await forwarder.waitForDeployment();
  const forwarderAddr = await forwarder.getAddress();
  console.log("PaymentForwarder deployed to:", forwarderAddr);

  console.log("\n========================================");
  console.log("Resolver:          ", resolverAddr);
  console.log("PaymentForwarder:  ", forwarderAddr);
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
