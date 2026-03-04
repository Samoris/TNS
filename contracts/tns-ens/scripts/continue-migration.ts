import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const V3_BASE_REGISTRAR = "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629";
const V2_BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";

const V3_CONTRACTS = {
  registry: "0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e",
  baseRegistrar: "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629",
  dummyOracle: "0x903cc70Cda037249e8D1870Bcd6C528710B73b7E",
  stablePriceOracle: "0x77C5F276dd8f7321E42580AC53E73859C080A0f2",
  reverseRegistrar: "0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080",
  root: "0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24",
  controller: "0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80",
  resolver: "0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b",
  paymentForwarder: "0xF661722f065D8606CC6b5be84296D67D9fe7bD13",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Continuing migration with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  const v3Registrar = new ethers.Contract(V3_BASE_REGISTRAR, [
    "function register(uint256 id, address owner, uint256 duration) external returns(uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function nameExpires(uint256 id) view returns (uint256)",
    "function removeController(address controller) external",
    "function controllers(address) view returns (bool)"
  ], deployer);

  const v2Registrar = new ethers.Contract(V2_BASE_REGISTRAR, [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function nameExpires(uint256 id) view returns (uint256)"
  ], deployer);

  const migFile = path.join(__dirname, '..', '..', '..', 'server', 'migrated-domains.json');
  const migData = JSON.parse(fs.readFileSync(migFile, 'utf8'));
  const domains = migData.domains;

  let migrated = 0, skipped = 0, failed = 0;
  const successfulDomains: any[] = [];
  const failedNames: string[] = [];

  for (const domain of domains) {
    const name = domain.name;
    const labelhash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const tokenId = ethers.getBigInt(labelhash);

    // Check if already migrated to V3
    try {
      const owner = await v3Registrar.ownerOf(tokenId);
      const expires = await v3Registrar.nameExpires(tokenId);
      skipped++;
      successfulDomains.push({
        oldTokenId: domain.oldTokenId || 0,
        name,
        newTokenId: tokenId.toString(),
        owner,
        expires: Number(expires)
      });
      continue;
    } catch {}

    // Get V2 data and migrate
    try {
      const [owner, expires] = await Promise.all([
        v2Registrar.ownerOf(tokenId),
        v2Registrar.nameExpires(tokenId)
      ]);

      const expiresNum = Number(expires);
      const now = Math.floor(Date.now() / 1000);
      if (expiresNum <= now) {
        console.log("[EXPIRED]", name);
        failed++;
        failedNames.push(name);
        continue;
      }

      const duration = expiresNum - now;
      const tx = await v3Registrar.register(tokenId, owner, duration);
      await tx.wait();
      migrated++;
      successfulDomains.push({
        oldTokenId: domain.oldTokenId || 0,
        name,
        newTokenId: tokenId.toString(),
        owner,
        expires: expiresNum
      });
      if (migrated % 5 === 0) console.log(`[MIGRATED] ${migrated} new, latest: ${name}`);
    } catch (e: any) {
      console.log(`[FAIL] ${name}: ${e.message?.substring(0, 80)}`);
      failed++;
      failedNames.push(name);
    }
  }

  console.log("\n=== Migration Summary ===");
  console.log("Already on V3:", skipped);
  console.log("Newly migrated:", migrated);
  console.log("Failed:", failed, failedNames.length > 0 ? `(${failedNames.join(', ')})` : '');
  console.log("Total successful:", successfulDomains.length);

  // Update migration file
  const updated = {
    domains: successfulDomains,
    generatedAt: new Date().toISOString(),
    v3Contracts: V3_CONTRACTS
  };
  fs.writeFileSync(migFile, JSON.stringify(updated, null, 2));
  console.log("Updated migrated-domains.json");

  // Remove deployer as controller
  console.log("\nRemoving deployer as controller...");
  const txRemove = await v3Registrar.removeController(deployer.address);
  await txRemove.wait();
  console.log("Deployer removed as controller");

  // Verify
  const isDeployerCtrl = await v3Registrar.controllers(deployer.address);
  console.log("Deployer still controller:", isDeployerCtrl);

  console.log("\nBalance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
}

main().catch(console.error);
