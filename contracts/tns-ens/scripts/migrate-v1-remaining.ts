import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const V3_BASE_REGISTRAR = "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629";
const V2_BASE_REGISTRAR = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";

const DOMAINS_TO_MIGRATE = ["zet", "geesmart", "cryptohomie", "microlincoln", "mendo", "biglahd", "mast"];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Migrating remaining V1 controller domains with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  const v3Registrar = new ethers.Contract(V3_BASE_REGISTRAR, [
    "function register(uint256 id, address owner, uint256 duration) external returns(uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function addController(address controller) external",
    "function removeController(address controller) external",
    "function controllers(address) view returns (bool)"
  ], deployer);

  const v2Registrar = new ethers.Contract(V2_BASE_REGISTRAR, [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function nameExpires(uint256 id) view returns (uint256)"
  ], deployer);

  const isDeployerCtrl = await v3Registrar.controllers(deployer.address);
  if (!isDeployerCtrl) {
    console.log("1. Adding deployer as V3 controller...");
    const tx = await v3Registrar.addController(deployer.address);
    await tx.wait();
    console.log("Done.\n");
  } else {
    console.log("1. Deployer already a V3 controller.\n");
  }

  const migFile = path.join(__dirname, '..', '..', '..', 'server', 'migrated-domains.json');
  const migData = JSON.parse(fs.readFileSync(migFile, 'utf8'));
  const existingDomains = migData.domains;

  console.log("2. Migrating 7 remaining domains...");
  let migrated = 0;
  const newDomains: any[] = [];

  for (const name of DOMAINS_TO_MIGRATE) {
    const labelhash = ethers.keccak256(ethers.toUtf8Bytes(name));
    const tokenId = ethers.getBigInt(labelhash);

    try {
      await v3Registrar.ownerOf(tokenId);
      console.log(`  [SKIP] ${name}.trust already on V3`);
      continue;
    } catch {}

    try {
      const [owner, expires] = await Promise.all([
        v2Registrar.ownerOf(tokenId),
        v2Registrar.nameExpires(tokenId)
      ]);

      const expiresNum = Number(expires);
      const now = Math.floor(Date.now() / 1000);
      const duration = expiresNum - now;

      if (duration <= 0) {
        console.log(`  [EXPIRED] ${name}.trust`);
        continue;
      }

      console.log(`  Migrating ${name}.trust -> owner: ${owner}, expires: ${new Date(expiresNum * 1000).toISOString()}`);
      const tx = await v3Registrar.register(tokenId, owner, duration);
      await tx.wait();
      console.log(`  [OK] ${name}.trust migrated`);
      migrated++;

      newDomains.push({
        oldTokenId: 0,
        name,
        newTokenId: tokenId.toString(),
        owner,
        expires: expiresNum
      });
    } catch (e: any) {
      console.log(`  [FAIL] ${name}.trust: ${e.message?.substring(0, 100)}`);
    }
  }

  console.log(`\n3. Removing deployer as V3 controller...`);
  const txRemove = await v3Registrar.removeController(deployer.address);
  await txRemove.wait();
  console.log("Done.");

  const isStillCtrl = await v3Registrar.controllers(deployer.address);
  console.log("Deployer still V3 controller:", isStillCtrl);

  if (newDomains.length > 0) {
    const allDomains = [...existingDomains, ...newDomains];
    const updated = {
      ...migData,
      domains: allDomains,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(migFile, JSON.stringify(updated, null, 2));
    console.log(`\nUpdated migrated-domains.json (${existingDomains.length} -> ${allDomains.length} domains)`);
  }

  console.log("\n=== Summary ===");
  console.log("Migrated:", migrated);
  console.log("Total domains now:", existingDomains.length + newDomains.length);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
}

main().catch(console.error);
