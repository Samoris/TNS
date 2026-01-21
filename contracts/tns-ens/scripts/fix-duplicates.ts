import { ethers } from "hardhat";

const LEGACY_REGISTRY = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";
const NEW_BASE_REGISTRAR = "0xc08c5b051a9cFbcd81584Ebb8870ed77eFc5E676";

interface DomainData {
  tokenId: number;
  name: string;
  owner: string;
  blockNumber: number;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Checking duplicate domain registrations...\n");

  // Get all mint events with block numbers
  const transferFilter = {
    address: LEGACY_REGISTRY,
    topics: [
      ethers.id("Transfer(address,address,uint256)"),
      ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32)
    ],
    fromBlock: 0,
    toBlock: "latest"
  };

  const legacyContract = new ethers.Contract(LEGACY_REGISTRY, [
    "function ownerOf(uint256 tokenId) view returns (address)"
  ], ethers.provider);

  const mintEvents = await ethers.provider.getLogs(transferFilter);
  const allDomains: DomainData[] = [];

  for (const event of mintEvents) {
    try {
      const tx = await ethers.provider.getTransaction(event.transactionHash);
      if (!tx) continue;

      const tokenId = parseInt(event.topics[3], 16);
      let name = "";
      const data = tx.data;

      if (data.length > 10) {
        const params = data.slice(10);
        for (let i = 0; i < params.length - 64; i += 64) {
          const chunk = params.slice(i, i + 64);
          const possibleLength = parseInt(chunk, 16);
          if (possibleLength > 0 && possibleLength < 64) {
            const strData = params.slice(i + 64, i + 64 + possibleLength * 2);
            try {
              const decoded = Buffer.from(strData, 'hex').toString('utf8');
              if (/^[a-z0-9-]+$/i.test(decoded) && decoded.length === possibleLength) {
                name = decoded.toLowerCase();
                break;
              }
            } catch {}
          }
        }
      }

      if (name) {
        let owner = "";
        try {
          owner = await legacyContract.ownerOf(tokenId);
        } catch {
          continue;
        }
        allDomains.push({ tokenId, name, owner, blockNumber: event.blockNumber });
      }
    } catch {}
  }

  // Group by name and find duplicates
  const byName = new Map<string, DomainData[]>();
  for (const d of allDomains) {
    if (!byName.has(d.name)) byName.set(d.name, []);
    byName.get(d.name)!.push(d);
  }

  console.log("=== Duplicate Domains (same name, multiple registrations) ===\n");
  
  const duplicates: { name: string; firstOwner: string; others: DomainData[] }[] = [];
  
  for (const [name, domains] of byName) {
    if (domains.length > 1) {
      // Sort by block number (earliest first)
      domains.sort((a, b) => a.blockNumber - b.blockNumber);
      const first = domains[0];
      const others = domains.slice(1);
      
      console.log(`${name}.trust:`);
      console.log(`  First registration: Token ${first.tokenId} -> ${first.owner} (block ${first.blockNumber})`);
      for (const other of others) {
        console.log(`  Duplicate: Token ${other.tokenId} -> ${other.owner} (block ${other.blockNumber})`);
      }
      console.log();
      
      duplicates.push({ name, firstOwner: first.owner, others });
    }
  }

  // Check current state in new system
  const baseRegistrar = new ethers.Contract(NEW_BASE_REGISTRAR, [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function available(uint256 id) view returns (bool)"
  ], ethers.provider);

  console.log("=== Current State in New System ===\n");
  
  for (const dup of duplicates) {
    const labelhash = ethers.keccak256(ethers.toUtf8Bytes(dup.name));
    const labelId = BigInt(labelhash);
    
    try {
      const currentOwner = await baseRegistrar.ownerOf(labelId);
      const isCorrect = currentOwner.toLowerCase() === dup.firstOwner.toLowerCase();
      console.log(`${dup.name}.trust: Current owner ${currentOwner.slice(0, 12)}... ${isCorrect ? '✓ CORRECT' : '✗ WRONG (should be ' + dup.firstOwner.slice(0, 12) + '...)'}`);
    } catch {
      console.log(`${dup.name}.trust: Not registered in new system`);
    }
  }
}

main().catch(console.error);
