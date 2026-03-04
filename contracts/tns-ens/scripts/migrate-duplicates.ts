import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const V3_BASE_REGISTRAR = "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629";

const ASSIGNMENTS = [
  { owner: "0x96cFA97Cd9D7c078E1bd1273D2FAFB543E5e113d", newName: "cc" },
  { owner: "0x5279931D35b97eCd3287ED71b92723F76893dEf4", newName: "ccc" },
  { owner: "0x8AC01eC4078dC042338d195F831aB2Cf219282dC", newName: "mm" },
  { owner: "0x634EA5142039756816418931AAB3A26e7a209f8c", newName: "mmm" },
  { owner: "0xD6A2c91148A6Ee07A9962dcDb45932157256DE17", newName: "ff" },
  { owner: "0xA7164fED973EEE92417EB1483CB4bc92C70d1b1F", newName: "fff" },
  { owner: "0x9ED96b285F71aa4c807eEBFAb774B2Dab1149b69", newName: "ffff" },
  { owner: "0x606a0B82CeB6855790138dc514c8a54b9304c50B", newName: "vv" },
  { owner: "0xbcFb8bF3818FC956Ba242e726afE7Be16EFB3eAE", newName: "pp" },
  { owner: "0x09eB6e06EC6E41E1E47AEDE21406328849427add", newName: "rr" },
  { owner: "0x218B3357f89d6B794Aba503E92301c39EefAca0a", newName: "ss" },
  { owner: "0xFAa096a92c0F4A4900F64Be56189632ea36d0F4b", newName: "sss" },
  { owner: "0x832A827E7BDB8Cb5e5F6b0983d59181F0aEd8303", newName: "ww" },
];

const ONE_YEAR = 365 * 24 * 60 * 60;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting replacement domains with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST\n");

  const v3Registrar = new ethers.Contract(V3_BASE_REGISTRAR, [
    "function register(uint256 id, address owner, uint256 duration) external returns(uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function addController(address controller) external",
    "function removeController(address controller) external",
    "function controllers(address) view returns (bool)"
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

  console.log("2. Minting 13 replacement domains (1 year duration)...");
  let minted = 0;
  const newDomains: any[] = [];

  for (const a of ASSIGNMENTS) {
    const labelhash = ethers.keccak256(ethers.toUtf8Bytes(a.newName));
    const tokenId = ethers.getBigInt(labelhash);

    try {
      await v3Registrar.ownerOf(tokenId);
      console.log(`  [SKIP] ${a.newName}.trust already exists`);
      continue;
    } catch {}

    try {
      console.log(`  Minting ${a.newName}.trust -> owner: ${a.owner}`);
      const tx = await v3Registrar.register(tokenId, a.owner, ONE_YEAR);
      await tx.wait();
      console.log(`  [OK] ${a.newName}.trust minted`);
      minted++;

      const now = Math.floor(Date.now() / 1000);
      newDomains.push({
        oldTokenId: 0,
        name: a.newName,
        newTokenId: tokenId.toString(),
        owner: a.owner,
        expires: now + ONE_YEAR
      });
    } catch (e: any) {
      console.log(`  [FAIL] ${a.newName}.trust: ${e.message?.substring(0, 100)}`);
    }
  }

  console.log(`\n3. Removing deployer as V3 controller...`);
  const txRemove = await v3Registrar.removeController(deployer.address);
  await txRemove.wait();
  console.log("Done.");

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
  console.log("Minted:", minted);
  console.log("Total domains now:", existingDomains.length + newDomains.length);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TRUST");
}

main().catch(console.error);
