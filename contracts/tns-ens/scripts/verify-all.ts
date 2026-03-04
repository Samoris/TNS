import { ethers, run } from "hardhat";

const DEPLOYER = "0xDC1DE801d1a38cBCFBc91Ca019c0F2fCcAf1AD14";

const TNS_REGISTRY = "0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e";
const BASE_REGISTRAR = "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629";
const DUMMY_ORACLE = "0x903cc70Cda037249e8D1870Bcd6C528710B73b7E";
const STABLE_PRICE_ORACLE = "0x77C5F276dd8f7321E42580AC53E73859C080A0f2";
const REVERSE_REGISTRAR = "0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080";
const ROOT = "0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24";
const CONTROLLER = "0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80";
const RESOLVER = "0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b";
const PAYMENT_FORWARDER = "0xF661722f065D8606CC6b5be84296D67D9fe7bD13";

const TRUST_LABEL = ethers.keccak256(ethers.toUtf8Bytes("trust"));
const ROOT_NODE = ethers.ZeroHash;
const TRUST_NODE = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [ROOT_NODE, TRUST_LABEL]));

const SECONDS_PER_YEAR = 31557600;
const rentPrices = [
  ethers.parseEther("1000").toString(),
  ethers.parseEther("500").toString(),
  ethers.parseEther("100").toString(),
  ethers.parseEther("70").toString(),
  ethers.parseEther("30").toString(),
];
const rentPricesPerSecond = rentPrices.map(p => (BigInt(p) / BigInt(SECONDS_PER_YEAR)).toString());

const TRUST_USD_PRICE = 100000000;
const transferPeriodEnds = 0;

interface VerifyTask {
  name: string;
  address: string;
  constructorArguments: any[];
  contract?: string;
}

const contracts: VerifyTask[] = [
  {
    name: "TNSRegistry",
    address: TNS_REGISTRY,
    constructorArguments: [],
    contract: "registry/TNSRegistry.sol:TNSRegistry",
  },
  {
    name: "BaseRegistrarImplementation",
    address: BASE_REGISTRAR,
    constructorArguments: [TNS_REGISTRY, TRUST_NODE, transferPeriodEnds],
    contract: "ethregistrar/contracts/BaseRegistrarImplementation.sol:BaseRegistrarImplementation",
  },
  {
    name: "DummyOracle",
    address: DUMMY_ORACLE,
    constructorArguments: [TRUST_USD_PRICE],
    contract: "ethregistrar/contracts/DummyOracle.sol:DummyOracle",
  },
  {
    name: "StablePriceOracle",
    address: STABLE_PRICE_ORACLE,
    constructorArguments: [DUMMY_ORACLE, rentPricesPerSecond],
    contract: "ethregistrar/contracts/StablePriceOracle.sol:StablePriceOracle",
  },
  {
    name: "ReverseRegistrar",
    address: REVERSE_REGISTRAR,
    constructorArguments: [TNS_REGISTRY],
    contract: "reverseRegistrar/ReverseRegistrar.sol:ReverseRegistrar",
  },
  {
    name: "Root",
    address: ROOT,
    constructorArguments: [TNS_REGISTRY, ethers.ZeroAddress, DEPLOYER],
    contract: "root/Root.sol:Root",
  },
  {
    name: "TNSRegistrarController",
    address: CONTROLLER,
    constructorArguments: [BASE_REGISTRAR, STABLE_PRICE_ORACLE, TREASURY],
    contract: "ethregistrar/contracts/ETHRegistrarController.sol:TNSRegistrarController",
  },
  {
    name: "Resolver",
    address: RESOLVER,
    constructorArguments: [TNS_REGISTRY, CONTROLLER, REVERSE_REGISTRAR],
    contract: "resolvers/Resolver.sol:Resolver",
  },
  {
    name: "PaymentForwarder",
    address: PAYMENT_FORWARDER,
    constructorArguments: [TNS_REGISTRY],
    contract: "utils/PaymentForwarder.sol:PaymentForwarder",
  },
];

async function main() {
  console.log("=== Verifying all TNS V2 contracts ===\n");

  for (const c of contracts) {
    console.log(`Verifying ${c.name} at ${c.address}...`);
    try {
      await run("verify:verify", {
        address: c.address,
        constructorArguments: c.constructorArguments,
        contract: c.contract,
      });
      console.log(`  ✓ ${c.name} verified successfully!\n`);
    } catch (e: any) {
      if (e.message?.includes("Already Verified") || e.message?.includes("already verified")) {
        console.log(`  ✓ ${c.name} already verified.\n`);
      } else {
        console.log(`  ✗ ${c.name} failed: ${e.message?.slice(0, 200)}\n`);
      }
    }
  }

  console.log("=== Verification complete ===");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
