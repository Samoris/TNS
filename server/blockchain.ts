import { ethers } from "ethers";

// Intuition mainnet configuration
const CHAIN_ID = 1155;
const RPC_URL = "https://intuition.calderachain.xyz";
const TNS_REGISTRY_ADDRESS = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

// Intuition EthMultiVault (Knowledge Graph) for creating atoms
// Proxy contract (TransparentUpgradeableProxy) on Intuition mainnet (Chain ID: 1155)
const INTUITION_MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
// Implementation (MultiVault): 0xc6f28A5fFe30eee3fadE5080B8930C58187F4903

// Minimal ABI for reading domain data
const TNS_REGISTRY_ABI = [
  "function tokenIdToDomain(uint256) view returns (string)",
  "function getDomainInfo(string) view returns (address owner, uint256 tokenId, uint256 expirationTime, bool exists)",
  "function domains(string) view returns (string name, uint256 expirationTime, bool exists)",
  "function isAvailable(string) view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function ownerOf(uint256) view returns (address)"
];

// Intuition EthMultiVault ABI for atom creation (v1.5 mainnet)
const INTUITION_MULTIVAULT_ABI = [
  "function createAtom(bytes atomUri) payable returns (uint256)",
  "function createTriple(uint256 subjectId, uint256 predicateId, uint256 objectId) payable returns (uint256)",
  "function atomsByHash(bytes32) view returns (uint256)",
  "function atoms(uint256) view returns (bytes)",
  "function count() view returns (uint256)",
  "function atomConfig() view returns (uint256 atomWalletInitialDepositAmount, uint256 atomCreationProtocolFee)",
  "function generalConfig() view returns (address admin, address protocolMultisig, uint256 feeDenominator, uint256 minDeposit, uint256 minShare, uint256 atomUriMaxLength, uint256 decimalPrecision, uint256 minDelay)",
  "function vaults(uint256) view returns (uint256 totalAssets, uint256 totalShares)"
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private multivaultContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.contract = new ethers.Contract(
      TNS_REGISTRY_ADDRESS,
      TNS_REGISTRY_ABI,
      this.provider
    );
    this.multivaultContract = new ethers.Contract(
      INTUITION_MULTIVAULT_ADDRESS,
      INTUITION_MULTIVAULT_ABI,
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

  /**
   * Get total supply of registered domain NFTs
   */
  async getTotalSupply(): Promise<number> {
    try {
      const totalSupply = await this.contract.totalSupply();
      return Number(totalSupply);
    } catch (error) {
      console.error('Error getting total supply:', error);
      return 0;
    }
  }

  /**
   * Scan all registered domains from the blockchain
   */
  async scanAllDomains(onProgress?: (current: number, total: number) => void): Promise<Array<{
    name: string;
    owner: string;
    expirationTime: Date;
    tokenId: string;
  }>> {
    const domains: Array<{
      name: string;
      owner: string;
      expirationTime: Date;
      tokenId: string;
    }> = [];

    try {
      const totalSupply = await this.getTotalSupply();
      console.log(`Scanning ${totalSupply} registered domains...`);

      for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
        if (onProgress) {
          onProgress(tokenId, totalSupply);
        }

        try {
          const domain = await this.getDomainByTokenId(tokenId);
          if (domain) {
            domains.push(domain);
          }
        } catch (error) {
          console.error(`Error scanning token ${tokenId}:`, error);
        }
      }

      console.log(`Found ${domains.length} valid domains`);
      return domains;
    } catch (error) {
      console.error('Error scanning domains:', error);
      return domains;
    }
  }

  /**
   * Get the cost to create an atom in Intuition (in wei)
   * Cost = atomWalletInitialDepositAmount + atomCreationProtocolFee
   * Note: The atomWalletInitialDepositAmount already includes the minimum deposit requirements
   */
  async getAtomCost(): Promise<bigint> {
    try {
      const [atomWalletInitialDepositAmount, atomCreationProtocolFee] = await this.multivaultContract.atomConfig();
      
      // Total cost is the sum of wallet initial deposit and protocol fee
      // The wallet initial deposit already covers the minDeposit requirement
      const totalCost = BigInt(atomWalletInitialDepositAmount) + BigInt(atomCreationProtocolFee);
      console.log(`Atom cost: wallet=${atomWalletInitialDepositAmount}, protocol=${atomCreationProtocolFee}, total=${totalCost} (${Number(totalCost) / 1e18} TRUST)`);
      return totalCost;
    } catch (error) {
      console.error('Error getting atom cost:', error);
      // Return a reasonable default (0.0003 TRUST) if unable to fetch from contract
      return BigInt("300000000000000");
    }
  }

  /**
   * Get the total count of atoms created
   */
  async getAtomCount(): Promise<bigint> {
    try {
      const count = await this.multivaultContract.count();
      return count;
    } catch (error) {
      console.error('Error getting atom count:', error);
      return BigInt(0);
    }
  }

  /**
   * Check if an atom exists in Intuition by URI
   * Note: When atom doesn't exist, the contract may return empty data (0x)
   * which causes a CALL_EXCEPTION - we treat this as "atom does not exist"
   */
  async checkAtomExists(atomUri: string): Promise<{ exists: boolean; atomId: bigint }> {
    try {
      const uriBytes = ethers.toUtf8Bytes(atomUri);
      const hash = ethers.keccak256(uriBytes);
      const atomId = await this.multivaultContract.atomsByHash(hash);
      return {
        exists: atomId > BigInt(0),
        atomId
      };
    } catch (error: unknown) {
      const ethersError = error as { code?: string; value?: string; data?: string };
      // Handle both BAD_DATA and CALL_EXCEPTION with empty data - both mean atom doesn't exist
      if (
        (ethersError.code === 'BAD_DATA' && ethersError.value === '0x') ||
        (ethersError.code === 'CALL_EXCEPTION' && ethersError.data === '0x')
      ) {
        // Atom doesn't exist - this is expected, not an error
        return { exists: false, atomId: BigInt(0) };
      }
      // Only log unexpected errors
      console.error('Unexpected error checking atom existence:', error);
      return { exists: false, atomId: BigInt(0) };
    }
  }

  /**
   * Build transaction data for creating an atom (user signs this)
   */
  buildCreateAtomTransaction(atomUri: string): {
    to: string;
    data: string;
    value: string;
  } {
    const iface = new ethers.Interface(INTUITION_MULTIVAULT_ABI);
    const uriBytes = ethers.toUtf8Bytes(atomUri);
    const data = iface.encodeFunctionData('createAtom', [uriBytes]);
    
    return {
      to: INTUITION_MULTIVAULT_ADDRESS,
      data,
      value: '0' // Caller needs to add atom cost
    };
  }

  /**
   * Build transaction data for creating a triple (relationship)
   */
  buildCreateTripleTransaction(subjectId: bigint, predicateId: bigint, objectId: bigint): {
    to: string;
    data: string;
    value: string;
  } {
    const iface = new ethers.Interface(INTUITION_MULTIVAULT_ABI);
    const data = iface.encodeFunctionData('createTriple', [subjectId, predicateId, objectId]);
    
    return {
      to: INTUITION_MULTIVAULT_ADDRESS,
      data,
      value: '0' // Caller needs to add triple cost
    };
  }
}

export const blockchainService = new BlockchainService();
