import { ethers, run } from "hardhat";

const DEPLOYER = "0xDC1DE801d1a38cBCFBc91Ca019c0F2fCcAf1AD14";

const TNS_REGISTRY = "0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99";
const BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
const DUMMY_ORACLE = "0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb";
const STABLE_PRICE_ORACLE = "0x6F258639D183Fb7955B93d086FA9300eED79383A";
const REVERSE_REGISTRAR = "0x78Cd4f5149060De05a84040283812b0c056972eD";
const ROOT = "0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75";
const CONTROLLER = "0x7C553152e7e4c9d1498D921FB5bd05bDf287f268";
const RESOLVER = "0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5";
const PAYMENT_FORWARDER = "0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F";
const TREASURY = "0x629A5386F73283F80847154d16E359192a891f86";

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
