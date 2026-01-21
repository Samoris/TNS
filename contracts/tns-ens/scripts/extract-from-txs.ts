import { ethers } from "hardhat";

const LEGACY_REGISTRY = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

interface DomainData {
  tokenId: number;
  name: string;
  owner: string;
  txHash: string;
}

async function main() {
  console.log("Extracting domain names from transaction input data...\n");
  
  const contract = new ethers.Contract(LEGACY_REGISTRY, [
    "function ownerOf(uint256 tokenId) view returns (address)"
  ], ethers.provider);

  // Get Transfer events from zero address (mints)
  const transferFilter = {
    address: LEGACY_REGISTRY,
    topics: [
      ethers.id("Transfer(address,address,uint256)"),
      ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32) // from zero = mint
    ],
    fromBlock: 0,
    toBlock: "latest"
  };

  const mintEvents = await ethers.provider.getLogs(transferFilter);
  console.log(`Found ${mintEvents.length} mint events\n`);

  const domains: DomainData[] = [];

  // Common function signatures for domain registration
  const registerSigs = [
    "register(string)",
    "register(string,address)",
    "register(string,uint256)",
    "register(string,address,uint256)",
    "registerDomain(string)",
    "registerDomain(string,address)",
    "registerDomain(string,uint256)",
    "registerDomain(string,address,uint256)",
    "mint(string)",
    "mint(address,string)",
    "safeMint(address,string)",
    "commit(bytes32)",
    "reveal(string,bytes32)"
  ];

  const iface = new ethers.Interface(registerSigs.map(s => `function ${s}`));

  for (const event of mintEvents) {
    try {
      const tx = await ethers.provider.getTransaction(event.transactionHash);
      if (!tx) continue;

      const tokenId = parseInt(event.topics[3], 16);
      let name = "";

      // Try to decode the transaction input
      const data = tx.data;
      
      // Try each function signature
      for (const sig of registerSigs) {
        try {
          const decoded = iface.decodeFunctionData(sig.split("(")[0], data);
          // Find the string parameter (domain name)
          for (const arg of decoded) {
            if (typeof arg === "string" && arg.length > 0 && arg.length < 100) {
              // Looks like a domain name
              if (!arg.startsWith("0x") && /^[a-z0-9-]+$/i.test(arg)) {
                name = arg.toLowerCase();
                break;
              }
            }
          }
          if (name) break;
        } catch {
          // Try next signature
        }
      }

      // If no match, try to manually parse the input data
      if (!name && data.length > 10) {
        // Look for string patterns in the calldata
        // Strings in ABI are: offset, length, data
        try {
          // Skip function selector (4 bytes = 8 hex chars + 0x)
          const params = data.slice(10);
          
          // Try to find string data
          // Look for patterns that could be domain names
          for (let i = 0; i < params.length - 64; i += 64) {
            const chunk = params.slice(i, i + 64);
            // Check if this could be a string length (small number)
            const possibleLength = parseInt(chunk, 16);
            if (possibleLength > 0 && possibleLength < 64) {
              // Next chunk could be the string data
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
        } catch {}
      }

      // Get current owner
      let owner = "";
      try {
        owner = await contract.ownerOf(tokenId);
      } catch {
        owner = "burned";
      }

      if (name) {
        domains.push({ tokenId, name, owner, txHash: event.transactionHash });
        console.log(`Token ${tokenId}: ${name}.trust -> ${owner}`);
      } else {
        console.log(`Token ${tokenId}: Could not extract name (tx: ${event.transactionHash.slice(0, 16)}...)`);
      }

    } catch (e: any) {
      console.log(`Error processing event: ${e.message?.slice(0, 50)}`);
    }
  }

  console.log(`\n=== Successfully Extracted ${domains.length} Domain Names ===\n`);
  
  if (domains.length > 0) {
    console.log("JSON mapping:");
    console.log(JSON.stringify(domains, null, 2));
  }
}

main().catch(console.error);
