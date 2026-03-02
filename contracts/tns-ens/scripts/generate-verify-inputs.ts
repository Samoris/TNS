import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYER = "0xDC1DE801d1a38cBCFBc91Ca019c0F2fCcAf1AD14";
const TNS_REGISTRY = "0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99";
const BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
const DUMMY_ORACLE = "0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb";
const STABLE_PRICE_ORACLE = "0x6F258639D183Fb7955B93d086FA9300eED79383A";
const REVERSE_REGISTRAR = "0x78Cd4f5149060De05a84040283812b0c056972eD";
const ROOT = "0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75";
const CONTROLLER = "0xeA6469B9B917F06499807509ED2d1223cA85E1f9";
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

interface ContractInfo {
  name: string;
  address: string;
  contractPath: string;
  contractName: string;
  constructorArgs: any[];
  solcVersion: string;
}

const contracts: ContractInfo[] = [
  {
    name: "TNSRegistry",
    address: TNS_REGISTRY,
    contractPath: "registry/TNSRegistry.sol",
    contractName: "TNSRegistry",
    constructorArgs: [],
    solcVersion: "0.8.17",
  },
  {
    name: "BaseRegistrarImplementation",
    address: BASE_REGISTRAR,
    contractPath: "ethregistrar/contracts/BaseRegistrarImplementation.sol",
    contractName: "BaseRegistrarImplementation",
    constructorArgs: [TNS_REGISTRY, TRUST_NODE, 0],
    solcVersion: "0.8.17",
  },
  {
    name: "DummyOracle",
    address: DUMMY_ORACLE,
    contractPath: "ethregistrar/contracts/DummyOracle.sol",
    contractName: "DummyOracle",
    constructorArgs: [TRUST_USD_PRICE],
    solcVersion: "0.8.17",
  },
  {
    name: "StablePriceOracle",
    address: STABLE_PRICE_ORACLE,
    contractPath: "ethregistrar/contracts/StablePriceOracle.sol",
    contractName: "StablePriceOracle",
    constructorArgs: [DUMMY_ORACLE, rentPricesPerSecond],
    solcVersion: "0.8.17",
  },
  {
    name: "ReverseRegistrar",
    address: REVERSE_REGISTRAR,
    contractPath: "reverseRegistrar/ReverseRegistrar.sol",
    contractName: "ReverseRegistrar",
    constructorArgs: [TNS_REGISTRY],
    solcVersion: "0.8.17",
  },
  {
    name: "Root",
    address: ROOT,
    contractPath: "root/Root.sol",
    contractName: "Root",
    constructorArgs: [TNS_REGISTRY, ethers.ZeroAddress, DEPLOYER],
    solcVersion: "0.8.17",
  },
  {
    name: "TNSRegistrarController",
    address: CONTROLLER,
    contractPath: "ethregistrar/contracts/ETHRegistrarController.sol",
    contractName: "TNSRegistrarController",
    constructorArgs: [BASE_REGISTRAR, STABLE_PRICE_ORACLE, TREASURY],
    solcVersion: "0.8.17",
  },
  {
    name: "Resolver",
    address: RESOLVER,
    contractPath: "resolvers/Resolver.sol",
    contractName: "Resolver",
    constructorArgs: [TNS_REGISTRY, CONTROLLER, REVERSE_REGISTRAR],
    solcVersion: "0.8.17",
  },
  {
    name: "PaymentForwarder",
    address: PAYMENT_FORWARDER,
    contractPath: "utils/PaymentForwarder.sol",
    contractName: "PaymentForwarder",
    constructorArgs: [TNS_REGISTRY],
    solcVersion: "0.8.17",
  },
];

function encodeConstructorArgs(types: string[], values: any[]): string {
  if (types.length === 0) return "";
  return ethers.AbiCoder.defaultAbiCoder().encode(types, values).slice(2);
}

async function main() {
  console.log("=== Generating verification data for all TNS V2 contracts ===\n");

  const outputDir = path.join(__dirname, "verification");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const summary: any[] = [];

  for (const c of contracts) {
    console.log(`Processing ${c.name} at ${c.address}...`);

    const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
    if (!fs.existsSync(buildInfoDir)) {
      console.log("  No build-info found. Run 'npx hardhat compile' first.");
      continue;
    }

    const buildFiles = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".json"));
    let standardJsonInput: any = null;
    let compilerVersion = "";

    for (const bf of buildFiles) {
      const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, bf), "utf8"));
      if (buildInfo.output?.contracts?.[c.contractPath]?.[c.contractName]) {
        standardJsonInput = buildInfo.input;
        compilerVersion = buildInfo.solcVersion || buildInfo.solcLongVersion || c.solcVersion;
        break;
      }
    }

    if (!standardJsonInput) {
      console.log(`  Could not find build info for ${c.contractPath}:${c.contractName}`);
      continue;
    }

    const inputFile = path.join(outputDir, `${c.name}_standard_input.json`);
    fs.writeFileSync(inputFile, JSON.stringify(standardJsonInput, null, 2));

    const info = {
      name: c.name,
      address: c.address,
      contractPath: c.contractPath,
      contractName: c.contractName,
      compilerVersion: compilerVersion,
      optimizerEnabled: true,
      optimizerRuns: 200,
      constructorArgs: c.constructorArgs,
      standardJsonInputFile: `${c.name}_standard_input.json`,
    };

    const infoFile = path.join(outputDir, `${c.name}_info.json`);
    fs.writeFileSync(infoFile, JSON.stringify(info, null, 2));

    summary.push(info);
    console.log(`  ✓ Generated ${c.name}_standard_input.json and ${c.name}_info.json`);
    console.log(`    Compiler: v${compilerVersion}, Optimizer: 200 runs`);
  }

  const summaryFile = path.join(outputDir, "verification_summary.json");
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n=== Generated verification data for ${summary.length} contracts ===`);
  console.log(`Files saved to: ${outputDir}`);

  console.log("\n=== Contract Verification Summary ===\n");
  console.log("| Contract | Address | Compiler |");
  console.log("|----------|---------|----------|");
  for (const s of summary) {
    console.log(`| ${s.name} | ${s.address} | v${s.compilerVersion} |`);
  }

  console.log("\n\nTo verify manually on the explorer:");
  console.log("1. Go to https://explorer.intuition.systems/address/<CONTRACT_ADDRESS>");
  console.log("2. Click 'Verify & Publish' on the Contract tab");
  console.log("3. Select 'Standard JSON Input' method");
  console.log("4. Upload the corresponding _standard_input.json file");
  console.log("5. Set the compiler version and constructor arguments from _info.json");
  console.log("\nOr wait for the API to come back online and run: npx hardhat run scripts/verify-all.ts --network intuition");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
