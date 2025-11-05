import { ethers } from "ethers";

// Intuition mainnet configuration
const CHAIN_ID = 1155;
const RPC_URL = "https://intuition.calderachain.xyz";
const TNS_REGISTRY_ADDRESS = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

// Minimal ABI for reading domain data
const TNS_REGISTRY_ABI = [
  "function tokenIdToDomain(uint256) view returns (string)",
  "function getDomainInfo(string) view returns (address owner, uint256 tokenId, uint256 expirationTime, bool exists)",
  "function domains(string) view returns (string name, uint256 expirationTime, bool exists)",
  "function isAvailable(string) view returns (bool)"
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.contract = new ethers.Contract(
      TNS_REGISTRY_ADDRESS,
      TNS_REGISTRY_ABI,
      this.provider
    );
  }

  /**
   * Get domain name from token ID
   */
  async getDomainNameByTokenId(tokenId: number): Promise<string | null> {
    try {
      const domainName = await this.contract.tokenIdToDomain(tokenId);
      return domainName || null;
    } catch (error) {
      console.error(`Error getting domain name for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get complete domain information from blockchain
   */
  async getDomainInfo(domainName: string): Promise<{
    owner: string;
    tokenId: bigint;
    expirationTime: bigint;
    exists: boolean;
  } | null> {
    try {
      const [owner, tokenId, expirationTime, exists] = await this.contract.getDomainInfo(domainName);
      return {
        owner,
        tokenId,
        expirationTime,
        exists
      };
    } catch (error) {
      console.error(`Error getting domain info for ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Get domain data directly from blockchain by token ID
   */
  async getDomainByTokenId(tokenId: number): Promise<{
    name: string;
    owner: string;
    expirationTime: Date;
    tokenId: string;
  } | null> {
    try {
      // First get the domain name from token ID
      const domainName = await this.getDomainNameByTokenId(tokenId);
      
      if (!domainName) {
        console.log(`No domain found for token ID ${tokenId}`);
        return null;
      }

      // Then get the full domain info
      const domainInfo = await this.getDomainInfo(domainName);
      
      if (!domainInfo || !domainInfo.exists) {
        console.log(`Domain ${domainName} does not exist`);
        return null;
      }

      return {
        name: domainName,
        owner: domainInfo.owner,
        expirationTime: new Date(Number(domainInfo.expirationTime) * 1000),
        tokenId: domainInfo.tokenId.toString()
      };
    } catch (error) {
      console.error(`Error getting domain by token ID ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Check if a domain is available for registration on the blockchain
   */
  async isAvailable(domainName: string): Promise<boolean> {
    try {
      const available = await this.contract.isAvailable(domainName);
      return available;
    } catch (error) {
      console.error(`Error checking availability for ${domainName}:`, error);
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();
