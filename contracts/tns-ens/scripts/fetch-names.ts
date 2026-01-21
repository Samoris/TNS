import { ethers } from "hardhat";

const LEGACY_REGISTRY = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

interface DomainData {
  tokenId: number;
  name: string;
  owner: string;
}

async function main() {
  console.log("Fetching domain names from metadata API...\n");
  
  const contract = new ethers.Contract(LEGACY_REGISTRY, [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ], ethers.provider);

  const domains: DomainData[] = [];

  for (let i = 1; i <= 132; i++) {
    try {
      const uri = await contract.tokenURI(i);
      const owner = await contract.ownerOf(i);
      
      // Fetch metadata from URI
      const response = await fetch(uri);
      if (response.ok) {
        const metadata = await response.json();
        const name = metadata.name?.replace('.trust', '') || `token${i}`;
        domains.push({ tokenId: i, name, owner });
        console.log(`Token ${i}: ${name}.trust -> ${owner}`);
      } else {
        console.log(`Token ${i}: Failed to fetch metadata (${response.status})`);
      }
    } catch (e: any) {
      console.log(`Token ${i}: Error - ${e.message?.slice(0, 50)}`);
    }
    
    // Small delay to avoid rate limiting
    if (i % 10 === 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n=== Found ${domains.length} domains ===\n`);
  
  // Output as JSON for migration
  console.log("Domain mapping (for migration):");
  console.log(JSON.stringify(domains, null, 2));
}

main().catch(console.error);
