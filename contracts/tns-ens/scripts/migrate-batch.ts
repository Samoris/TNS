import { ethers } from "hardhat";

const OLD_BASE_REGISTRAR = "0xc08c5b051a9cFbcd81584Ebb8870ed77eFc5E676";
const NEW_BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
const TRUST_NODE = "0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985";

const OLD_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function nameExpires(uint256 id) view returns (uint256)"
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

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.message?.includes("Too Many Requests") && i < retries - 1) {
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
  console.log(`Batch migration: START=${START} SIZE=${SIZE}`);
  const bal = await withRetry(() => ethers.provider.getBalance(deployer.address));
  console.log("Balance:", ethers.formatEther(bal), "TRUST\n");

  const oldReg = new ethers.Contract(OLD_BASE_REGISTRAR, OLD_ABI, ethers.provider);
  const newReg = new ethers.Contract(NEW_BASE_REGISTRAR, NEW_ABI, deployer);

  const totalSupply = Number(await withRetry(() => oldReg.totalSupply()));
  console.log(`Total supply: ${totalSupply}`);
  const end = Math.min(START + SIZE, totalSupply);
  console.log(`Processing tokens ${START} to ${end - 1}\n`);

  const isCtrl = await withRetry(() => newReg.controllers(deployer.address));
  if (!isCtrl) {
    const tx = await newReg.addController(deployer.address);
    await tx.wait();
    console.log("Added deployer as controller\n");
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  let migrated = 0, skipped = 0, failed = 0;

  for (let i = START; i < end; i++) {
    try {
      await delay(500);
      const tokenId = await withRetry(() => oldReg.tokenByIndex(i));
      await delay(300);
      const available = await withRetry(() => newReg.available(tokenId));
      if (!available) {
        skipped++;
        continue;
      }

      await delay(300);
      const owner = await withRetry(() => oldReg.ownerOf(tokenId));
      let expiry = BigInt(0);
      try {
        await delay(300);
        expiry = await withRetry(() => oldReg.nameExpires(tokenId));
      } catch {}

      const duration = expiry > now ? expiry - now : BigInt(365 * 24 * 60 * 60);

      await delay(300);
      const tx = await newReg.register(tokenId, owner, duration);
      await tx.wait();
      migrated++;
      console.log(`  [${i}] Migrated (total: ${migrated}, skipped: ${skipped})`);
    } catch (e: any) {
      console.log(`  [${i}] FAILED: ${e.message?.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\nBatch complete: migrated=${migrated} skipped=${skipped} failed=${failed}`);
  const endBal = await withRetry(() => ethers.provider.getBalance(deployer.address));
  console.log("Balance:", ethers.formatEther(endBal), "TRUST");
  if (end < totalSupply) {
    console.log(`\nNext batch: BATCH_START=${end} BATCH_SIZE=${SIZE}`);
  } else {
    console.log("\nAll domains processed!");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
