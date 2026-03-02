import { ethers } from "hardhat";

const OLD_BASE_REGISTRAR = "0xc08c5b051a9cFbcd81584Ebb8870ed77eFc5E676";
const NEW_BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";

const OLD_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function nameExpires(uint256 id) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

const NEW_ABI = [
  "function register(uint256 id, address owner, uint256 duration) external returns (uint256)",
  "function addController(address controller) external",
  "function controllers(address) view returns (bool)",
  "function available(uint256 id) view returns (bool)"
];

const START = parseInt(process.env.BATCH_START || "0");
const SIZE = parseInt(process.env.BATCH_SIZE || "30");

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e.message || "";
      if ((msg.includes("Too Many Requests") || msg.includes("rate") || msg.includes("429")) && i < retries - 1) {
        console.log(`    Rate limited, waiting ${delayMs}ms...`);
        await delay(delayMs);
        delayMs *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new Error("Exhausted retries");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Event-based migration: START=${START} SIZE=${SIZE}`);

  await delay(1000);
  const bal = await withRetry(() => ethers.provider.getBalance(deployer.address));
  console.log("Balance:", ethers.formatEther(bal), "TRUST\n");

  const oldReg = new ethers.Contract(OLD_BASE_REGISTRAR, OLD_ABI, ethers.provider);
  const newReg = new ethers.Contract(NEW_BASE_REGISTRAR, NEW_ABI, deployer);

  console.log("Scanning mint events from old registrar...");
  await delay(1000);
  const mintFilter = {
    address: OLD_BASE_REGISTRAR,
    topics: [
      ethers.id("Transfer(address,address,uint256)"),
      ethers.zeroPadValue(ethers.ZeroAddress, 32)
    ],
    fromBlock: 0,
    toBlock: "latest"
  };
  const mintEvents = await withRetry(() => ethers.provider.getLogs(mintFilter));
  
  const tokenIds: bigint[] = [];
  const seen = new Set<string>();
  for (const event of mintEvents) {
    const tokenId = BigInt(event.topics[3]);
    const key = tokenId.toString();
    if (!seen.has(key)) {
      seen.add(key);
      tokenIds.push(tokenId);
    }
  }
  console.log(`Found ${tokenIds.length} unique tokens\n`);

  const batch = tokenIds.slice(START, START + SIZE);
  console.log(`Processing tokens ${START} to ${START + batch.length - 1}\n`);

  await delay(1000);
  const isCtrl = await withRetry(() => newReg.controllers(deployer.address));
  if (!isCtrl) {
    const tx = await newReg.addController(deployer.address);
    await tx.wait();
    console.log("Added deployer as controller\n");
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  let migrated = 0, skipped = 0, failed = 0;

  for (let idx = 0; idx < batch.length; idx++) {
    const tokenId = batch[idx];
    try {
      await delay(800);
      const available = await withRetry(() => newReg.available(tokenId));
      if (!available) {
        skipped++;
        continue;
      }

      await delay(500);
      let owner: string;
      try {
        owner = await withRetry(() => oldReg.ownerOf(tokenId));
      } catch {
        skipped++;
        continue;
      }

      let expiry = BigInt(0);
      try {
        await delay(300);
        expiry = await withRetry(() => oldReg.nameExpires(tokenId));
      } catch {}

      const duration = expiry > now ? expiry - now : BigInt(365 * 24 * 60 * 60);

      await delay(500);
      const tx = await newReg.register(tokenId, owner, duration);
      await tx.wait();
      migrated++;
      console.log(`  [${START + idx}] Migrated (total=${migrated} skipped=${skipped})`);
    } catch (e: any) {
      console.log(`  [${START + idx}] FAILED: ${e.message?.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\nBatch complete: migrated=${migrated} skipped=${skipped} failed=${failed}`);
  await delay(500);
  const endBal = await withRetry(() => ethers.provider.getBalance(deployer.address));
  console.log("Balance:", ethers.formatEther(endBal), "TRUST");
  if (START + SIZE < tokenIds.length) {
    console.log(`\nNext: BATCH_START=${START + SIZE} BATCH_SIZE=${SIZE}`);
  } else {
    console.log("\nAll domains processed!");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
