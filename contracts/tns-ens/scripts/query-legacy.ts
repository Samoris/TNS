import { ethers } from "hardhat";

const LEGACY_REGISTRY = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

async function main() {
  console.log("Querying legacy contract for domain registration events...\n");
  
  // Try multiple event signatures that legacy contracts might use
  const eventSignatures = [
    "event DomainRegistered(uint256 indexed tokenId, string name, address indexed owner, uint256 expiry)",
    "event DomainRegistered(string indexed name, address indexed owner, uint256 expiry)",
    "event NameRegistered(uint256 indexed id, string name, address indexed owner, uint256 expires)",
    "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 expires)",
    "event Register(string name, address indexed owner)"
  ];

  for (const sig of eventSignatures) {
    try {
      console.log(`Trying: ${sig}`);
      const iface = new ethers.Interface([sig]);
      const eventName = sig.match(/event (\w+)/)?.[1] || "";
      const topic = iface.getEvent(eventName)?.topicHash;
      
      const logs = await ethers.provider.getLogs({
        address: LEGACY_REGISTRY,
        topics: [topic],
        fromBlock: 0,
        toBlock: "latest"
      });
      
      console.log(`  Found ${logs.length} events\n`);
      
      if (logs.length > 0) {
        console.log("=== Domain Names Found ===\n");
        for (const log of logs.slice(0, 20)) { // Show first 20
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            console.log(`  ${JSON.stringify(parsed?.args)}`);
          } catch {
            console.log(`  Could not parse: ${log.data.slice(0, 100)}`);
          }
        }
        if (logs.length > 20) {
          console.log(`  ... and ${logs.length - 20} more`);
        }
        break;
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message?.slice(0, 80)}\n`);
    }
  }

  // Also try to read contract storage or call view functions
  console.log("\n=== Trying Direct Contract Calls ===\n");
  
  const abis = [
    ["function tokenURI(uint256 tokenId) view returns (string)"],
    ["function getDomain(uint256 tokenId) view returns (string name, uint256 expiry, address owner)"],
    ["function domains(uint256) view returns (string name, uint256 expiry, address owner)"],
    ["function getName(uint256 tokenId) view returns (string)"],
    ["function idToName(uint256) view returns (string)"],
    ["function tokenIdToName(uint256) view returns (string)"]
  ];

  for (const abi of abis) {
    try {
      const contract = new ethers.Contract(LEGACY_REGISTRY, abi, ethers.provider);
      const funcName = abi[0].match(/function (\w+)/)?.[1];
      console.log(`Trying ${funcName}(1)...`);
      const result = await contract[funcName!](1);
      console.log(`  SUCCESS: ${JSON.stringify(result)}\n`);
      
      // If successful, get all domains
      if (result) {
        console.log("=== All Domain Names ===\n");
        for (let i = 1; i <= 132; i++) {
          try {
            const data = await contract[funcName!](i);
            const name = typeof data === "string" ? data : data.name || data[0];
            if (name) {
              console.log(`  Token ${i}: ${name}.trust`);
            }
          } catch {
            break;
          }
        }
      }
      break;
    } catch (e: any) {
      console.log(`  Not available: ${e.message?.slice(0, 60)}\n`);
    }
  }

  // Try reading tokenURI which often contains the name
  console.log("\n=== Checking TokenURI for Names ===\n");
  try {
    const contract = new ethers.Contract(LEGACY_REGISTRY, [
      "function tokenURI(uint256 tokenId) view returns (string)"
    ], ethers.provider);
    
    for (let i = 1; i <= 5; i++) {
      try {
        const uri = await contract.tokenURI(i);
        console.log(`Token ${i} URI: ${uri.slice(0, 200)}`);
      } catch (e: any) {
        console.log(`Token ${i}: ${e.message?.slice(0, 60)}`);
      }
    }
  } catch {}
}

main().catch(console.error);
