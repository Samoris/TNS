import { ethers } from "hardhat";

const OLD_REGISTRY = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";
const OLD_BASE_REGISTRAR = "0xc08c5b051a9cFbcd81584Ebb8870ed77eFc5E676";
const OLD_RESOLVER = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";

const NEW_REGISTRY = "0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99";
const NEW_BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
const NEW_RESOLVER = "0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5";

const TRUST_NODE = "0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985";

const OLD_REGISTRAR_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function nameExpires(uint256 id) view returns (uint256)"
];

const OLD_RESOLVER_ABI = [
  "function addr(bytes32 node) view returns (address)",
  "function name(bytes32 node) view returns (string)",
  "function text(bytes32 node, string key) view returns (string)"
];

const NEW_REGISTRAR_ABI = [
  "function register(uint256 id, address owner, uint256 duration) external returns (uint256)",
  "function addController(address controller) external",
  "function controllers(address) view returns (bool)",
  "function available(uint256 id) view returns (bool)",
  "function reclaim(uint256 id, address owner) external"
];

const NEW_RESOLVER_ABI = [
  "function setAddr(bytes32 node, address addr) external",
  "function setName(bytes32 node, string name) external",
  "function setText(bytes32 node, string key, string value) external"
];

const NEW_REGISTRY_ABI = [
  "function setResolver(bytes32 node, address resolver) external",
  "function owner(bytes32 node) view returns (address)"
];

interface DomainData {
  tokenId: bigint;
  name: string;
  owner: string;
  expiry: bigint;
  resolvedAddr: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running migration with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  const oldRegistrar = new ethers.Contract(OLD_BASE_REGISTRAR, OLD_REGISTRAR_ABI, ethers.provider);
  const oldResolver = new ethers.Contract(OLD_RESOLVER, OLD_RESOLVER_ABI, ethers.provider);
  const newRegistrar = new ethers.Contract(NEW_BASE_REGISTRAR, NEW_REGISTRAR_ABI, deployer);
  const newResolver = new ethers.Contract(NEW_RESOLVER, NEW_RESOLVER_ABI, deployer);
  const newRegistry = new ethers.Contract(NEW_REGISTRY, NEW_REGISTRY_ABI, deployer);

  console.log("=== Step 1: Read existing domains from old contracts ===\n");

  let totalSupply: bigint;
  try {
    totalSupply = await oldRegistrar.totalSupply();
    console.log(`Total supply in old registrar: ${totalSupply}\n`);
  } catch (e) {
    console.log("Could not read totalSupply, falling back to event scanning...");
    totalSupply = BigInt(0);
  }

  const domains: DomainData[] = [];
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (totalSupply > 0) {
    for (let i = 0; i < Number(totalSupply); i++) {
      try {
        const tokenId = await oldRegistrar.tokenByIndex(i);
        const owner = await oldRegistrar.ownerOf(tokenId);
        let expiry = BigInt(0);
        try {
          expiry = await oldRegistrar.nameExpires(tokenId);
        } catch {}

        const labelhash = ethers.zeroPadValue(ethers.toBeHex(tokenId), 32);
        const node = ethers.keccak256(ethers.concat([TRUST_NODE, labelhash]));

        let resolvedAddr = "";
        try {
          resolvedAddr = await oldResolver.addr(node);
          if (resolvedAddr === ethers.ZeroAddress) resolvedAddr = "";
        } catch {}

        domains.push({
          tokenId,
          name: "",
          owner,
          expiry,
          resolvedAddr
        });

        console.log(`  Token ${i}/${Number(totalSupply)}: ID=${tokenId.toString().slice(0, 16)}... owner=${owner.slice(0, 10)}... addr=${resolvedAddr ? resolvedAddr.slice(0, 10) + '...' : 'none'}`);
      } catch (e: any) {
        console.log(`  Token ${i}: skipped (${e.message?.slice(0, 50)})`);
      }
    }
  }

  if (domains.length === 0) {
    console.log("Trying Transfer event scanning...");
    const filter = {
      address: OLD_BASE_REGISTRAR,
      topics: [
        ethers.id("Transfer(address,address,uint256)"),
        ethers.zeroPadValue(ethers.ZeroAddress, 32)
      ],
      fromBlock: 0,
      toBlock: "latest"
    };
    const mintEvents = await ethers.provider.getLogs(filter);
    console.log(`Found ${mintEvents.length} mint events`);

    const seenTokens = new Set<string>();
    for (const event of mintEvents) {
      const tokenId = BigInt(event.topics[3]);
      const tokenKey = tokenId.toString();
      if (seenTokens.has(tokenKey)) continue;
      seenTokens.add(tokenKey);

      try {
        const owner = await oldRegistrar.ownerOf(tokenId);
        let expiry = BigInt(0);
        try {
          expiry = await oldRegistrar.nameExpires(tokenId);
        } catch {}

        const labelhash = ethers.zeroPadValue(ethers.toBeHex(tokenId), 32);
        const node = ethers.keccak256(ethers.concat([TRUST_NODE, labelhash]));

        let resolvedAddr = "";
        try {
          resolvedAddr = await oldResolver.addr(node);
          if (resolvedAddr === ethers.ZeroAddress) resolvedAddr = "";
        } catch {}

        domains.push({ tokenId, name: "", owner, expiry, resolvedAddr });
        console.log(`  Token ${tokenKey.slice(0, 16)}... -> ${owner.slice(0, 10)}...`);
      } catch {
        // burned or invalid
      }
    }
  }

  console.log(`\n=== Found ${domains.length} active domains ===\n`);

  if (domains.length === 0) {
    console.log("No domains to migrate.");
    return;
  }

  console.log("=== Step 2: Ensure deployer is controller on new BaseRegistrar ===\n");
  const isController = await newRegistrar.controllers(deployer.address);
  if (!isController) {
    console.log("Adding deployer as controller...");
    const tx = await newRegistrar.addController(deployer.address);
    await tx.wait();
    console.log("Done.\n");
  } else {
    console.log("Deployer is already a controller.\n");
  }

  console.log("=== Step 3: Migrate domains to new contracts ===\n");

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const domain of domains) {
    try {
      const labelId = domain.tokenId;

      const isAvailable = await newRegistrar.available(labelId);
      if (!isAvailable) {
        console.log(`  SKIP: token ${labelId.toString().slice(0, 16)}... already registered`);
        skipped++;
        continue;
      }

      let duration: bigint;
      if (domain.expiry > now) {
        duration = domain.expiry - now;
      } else {
        duration = BigInt(365 * 24 * 60 * 60);
      }

      console.log(`  Migrating token ${labelId.toString().slice(0, 16)}... to ${domain.owner.slice(0, 10)}...`);
      const regTx = await newRegistrar.register(labelId, domain.owner, duration);
      await regTx.wait();

      if (domain.resolvedAddr) {
        try {
          const labelhash = ethers.zeroPadValue(ethers.toBeHex(labelId), 32);
          const node = ethers.keccak256(ethers.concat([TRUST_NODE, labelhash]));

          const setResTx = await newRegistry.setResolver(node, NEW_RESOLVER);
          await setResTx.wait();

          const setAddrTx = await newResolver.setAddr(node, domain.resolvedAddr);
          await setAddrTx.wait();
          console.log(`    + Set resolver addr: ${domain.resolvedAddr.slice(0, 10)}...`);
        } catch (e: any) {
          console.log(`    ! Could not set resolver: ${e.message?.slice(0, 60)}`);
        }
      }

      migrated++;
      console.log(`  SUCCESS`);
    } catch (e: any) {
      console.log(`  FAILED: ${e.message?.slice(0, 100)}`);
      failed++;
    }
  }

  console.log("\n========================================");
  console.log("=== Migration Complete ===");
  console.log("========================================");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`\nRemaining balance:`, ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
