import { ethers } from "ethers";

// Intuition mainnet configuration
const CHAIN_ID = 1155;
const RPC_URL = "https://intuition.calderachain.xyz";

// ============================================
// ENS-FORKED CONTRACT ADDRESSES (UPDATE AFTER DEPLOYMENT)
// ============================================
const TNS_REGISTRY_ADDRESS_NEW = "0x0000000000000000000000000000000000000000"; // Deploy then update
const TNS_BASE_REGISTRAR_ADDRESS = "0x0000000000000000000000000000000000000000";
const TNS_CONTROLLER_ADDRESS = "0x0000000000000000000000000000000000000000";
const TNS_RESOLVER_ADDRESS_NEW = "0x0000000000000000000000000000000000000000";
const TNS_REVERSE_REGISTRAR_ADDRESS = "0x0000000000000000000000000000000000000000";
const TNS_PRICE_ORACLE_ADDRESS = "0x0000000000000000000000000000000000000000";
const TNS_PAYMENT_FORWARDER_ADDRESS_NEW = "0x0000000000000000000000000000000000000000";
const TRUST_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // TRUST ERC-20 token

// Use new contracts (set to true after deployment and migration)
const USE_NEW_CONTRACTS = false;

// Legacy contract addresses (still active until migration)
const TNS_REGISTRY_ADDRESS = "0x7C365AF9034b00dadc616dE7f38221C678D423Fa";

// Intuition EthMultiVault (Knowledge Graph) for creating atoms
// Proxy contract (TransparentUpgradeableProxy) on Intuition mainnet (Chain ID: 1155)
const INTUITION_MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
// Implementation (MultiVault): 0xc6f28A5fFe30eee3fadE5080B8930C58187F4903

// Minimal ABI for reading domain data (legacy contract)
const TNS_REGISTRY_ABI = [
  "function tokenIdToDomain(uint256) view returns (string)",
  "function getDomainInfo(string) view returns (address owner, uint256 tokenId, uint256 expirationTime, bool exists)",
  "function domains(string) view returns (string name, uint256 expirationTime, bool exists)",
  "function isAvailable(string) view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function ownerOf(uint256) view returns (address)"
];

// ENS-forked contract ABIs
const TNS_REGISTRY_ABI_NEW = [
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
  "function ttl(bytes32 node) view returns (uint64)",
  "function recordExists(bytes32 node) view returns (bool)"
];

const TNS_BASE_REGISTRAR_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function nameExpires(uint256 id) view returns (uint256)",
  "function available(uint256 id) view returns (bool)",
  "function GRACE_PERIOD() view returns (uint256)",
  "function baseNode() view returns (bytes32)",
  "event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires)",
  "event NameRenewed(uint256 indexed id, uint256 expires)"
];

const TNS_CONTROLLER_ABI = [
  "function available(string name) view returns (bool)",
  "function rentPrice(string name, uint256 duration) view returns (uint256)",
  "function commitments(bytes32) view returns (uint256)",
  "function MIN_COMMITMENT_AGE() view returns (uint256)",
  "function MAX_COMMITMENT_AGE() view returns (uint256)",
  "function MIN_REGISTRATION_DURATION() view returns (uint256)"
];

const TNS_RESOLVER_ABI_NEW = [
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function contenthash(bytes32 node) view returns (bytes)",
  "function name(bytes32 node) view returns (string)"
];

const TNS_REVERSE_REGISTRAR_ABI = [
  "function node(address addr) pure returns (bytes32)",
  "function defaultResolver() view returns (address)"
];

const TNS_PRICE_ORACLE_ABI = [
  "function price(string name, uint256 duration) view returns (uint256)",
  "function price3Char() view returns (uint256)",
  "function price4Char() view returns (uint256)",
  "function price5PlusChar() view returns (uint256)"
];

// Intuition EthMultiVault ABI for atom creation (v1.5 mainnet on Chain 1155)
// The contract uses createAtoms (plural, with curve) instead of createAtom (singular)
const INTUITION_MULTIVAULT_ABI = [
  "function createAtoms(bytes[] atomUris, uint256[] curveIds) payable returns (uint256[])",
  "function createTriple(uint256 subjectId, uint256 predicateId, uint256 objectId) payable returns (uint256)",
  "function atomsByHash(bytes32) view returns (uint256)",
  "function atoms(uint256) view returns (bytes)",
  "function count() view returns (uint256)",
  "function atomConfig() view returns (uint256 atomWalletInitialDepositAmount, uint256 atomCreationProtocolFee)",
  "function generalConfig() view returns (address admin, address protocolMultisig, uint256 feeDenominator, uint256 minDeposit, uint256 minShare, uint256 atomUriMaxLength, uint256 decimalPrecision, uint256 minDelay)",
  "function vaults(uint256) view returns (uint256 totalAssets, uint256 totalShares)",
  "function getAtomCost() view returns (uint256)",
  "function paused() view returns (bool)"
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract; // Legacy registry
  private multivaultContract: ethers.Contract;
  
  // ENS-forked contracts (initialized if USE_NEW_CONTRACTS is true)
  private registryNew: ethers.Contract | null = null;
  private baseRegistrar: ethers.Contract | null = null;
  private controller: ethers.Contract | null = null;
  private resolverNew: ethers.Contract | null = null;
  private reverseRegistrar: ethers.Contract | null = null;
  private priceOracle: ethers.Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Legacy contract (always initialized for backward compatibility)
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

    // Initialize ENS-forked contracts if enabled
    if (USE_NEW_CONTRACTS) {
      this.registryNew = new ethers.Contract(TNS_REGISTRY_ADDRESS_NEW, TNS_REGISTRY_ABI_NEW, this.provider);
      this.baseRegistrar = new ethers.Contract(TNS_BASE_REGISTRAR_ADDRESS, TNS_BASE_REGISTRAR_ABI, this.provider);
      this.controller = new ethers.Contract(TNS_CONTROLLER_ADDRESS, TNS_CONTROLLER_ABI, this.provider);
      this.resolverNew = new ethers.Contract(TNS_RESOLVER_ADDRESS_NEW, TNS_RESOLVER_ABI_NEW, this.provider);
      this.reverseRegistrar = new ethers.Contract(TNS_REVERSE_REGISTRAR_ADDRESS, TNS_REVERSE_REGISTRAR_ABI, this.provider);
      this.priceOracle = new ethers.Contract(TNS_PRICE_ORACLE_ADDRESS, TNS_PRICE_ORACLE_ABI, this.provider);
    }
  }

  /**
   * Calculate namehash for a domain (ENS-style)
   */
  public namehash(domain: string): string {
    let node = ethers.ZeroHash;
    if (domain === "") return node;

    const labels = domain.split(".").reverse();
    for (const label of labels) {
      const labelHash = ethers.keccak256(ethers.toUtf8Bytes(label));
      node = ethers.keccak256(ethers.concat([node, labelHash]));
    }
    return node;
  }

  /**
   * Calculate labelhash for a single label
   */
  public labelhash(label: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
  }

  /**
   * Check if using new ENS-forked contracts
   */
  public isUsingNewContracts(): boolean {
    return USE_NEW_CONTRACTS;
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
      // Use new contracts if enabled
      if (USE_NEW_CONTRACTS && this.controller) {
        const available = await this.controller.available(domainName);
        return available;
      }
      
      // Fall back to legacy contract
      const available = await this.contract.isAvailable(domainName);
      return available;
    } catch (error) {
      console.error(`Error checking availability for ${domainName}:`, error);
      return false;
    }
  }

  /**
   * Get rental price for a domain using ENS-forked controller
   */
  async getRentPrice(domainName: string, durationSeconds: number): Promise<bigint> {
    try {
      if (USE_NEW_CONTRACTS && this.controller) {
        const price = await this.controller.rentPrice(domainName, durationSeconds);
        return price;
      }
      
      // For legacy, calculate based on character length
      const length = domainName.length;
      const yearsFromSeconds = Math.ceil(durationSeconds / (365 * 24 * 60 * 60));
      let pricePerYear: bigint;
      if (length === 3) {
        pricePerYear = ethers.parseEther("100");
      } else if (length === 4) {
        pricePerYear = ethers.parseEther("70");
      } else {
        pricePerYear = ethers.parseEther("30");
      }
      return pricePerYear * BigInt(yearsFromSeconds);
    } catch (error) {
      console.error(`Error getting rent price for ${domainName}:`, error);
      return BigInt(0);
    }
  }

  /**
   * Get domain owner using ENS-forked registry (namehash-based)
   */
  async getDomainOwnerENS(domainName: string): Promise<string | null> {
    try {
      if (!USE_NEW_CONTRACTS || !this.registryNew) {
        // Fall back to legacy
        const info = await this.getDomainInfo(domainName);
        return info?.owner || null;
      }

      const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
      const node = this.namehash(fullName);
      const owner = await this.registryNew.owner(node);
      return owner === ethers.ZeroAddress ? null : owner;
    } catch (error) {
      console.error(`Error getting domain owner for ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Get resolved address for a domain using ENS-forked resolver
   */
  async getResolvedAddress(domainName: string): Promise<string | null> {
    try {
      if (!USE_NEW_CONTRACTS || !this.resolverNew) {
        return null;
      }

      const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
      const node = this.namehash(fullName);
      const addr = await this.resolverNew.addr(node);
      return addr === ethers.ZeroAddress ? null : addr;
    } catch (error) {
      console.error(`Error getting resolved address for ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Get reverse resolved name for an address
   */
  async getReverseName(address: string): Promise<string | null> {
    try {
      if (!USE_NEW_CONTRACTS || !this.reverseRegistrar || !this.resolverNew) {
        return null;
      }

      const reverseNode = await this.reverseRegistrar.node(address);
      const name = await this.resolverNew.name(reverseNode);
      return name || null;
    } catch (error) {
      console.error(`Error getting reverse name for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get domain expiration from base registrar (ENS-forked)
   */
  async getDomainExpiration(domainName: string): Promise<Date | null> {
    try {
      if (USE_NEW_CONTRACTS && this.baseRegistrar) {
        const labelHash = this.labelhash(domainName);
        // Convert hex string to BigInt properly using ethers
        const tokenId = ethers.getBigInt(labelHash);
        const expires = await this.baseRegistrar.nameExpires(tokenId);
        return new Date(Number(expires) * 1000);
      }
      
      // Fall back to legacy
      const info = await this.getDomainInfo(domainName);
      if (info && info.exists) {
        return new Date(Number(info.expirationTime) * 1000);
      }
      return null;
    } catch (error) {
      console.error(`Error getting domain expiration for ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Get text record for a domain using ENS-forked resolver
   */
  async getTextRecord(domainName: string, key: string): Promise<string | null> {
    try {
      if (!USE_NEW_CONTRACTS || !this.resolverNew) {
        return null;
      }

      const fullName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
      const node = this.namehash(fullName);
      const value = await this.resolverNew.text(node, key);
      return value || null;
    } catch (error) {
      console.error(`Error getting text record ${key} for ${domainName}:`, error);
      return null;
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
   * Uses the getAtomCost() view function which returns the total cost including all fees
   */
  async getAtomCost(): Promise<bigint> {
    try {
      // The getAtomCost() function returns the total cost directly
      const totalCost = await this.multivaultContract.getAtomCost();
      console.log(`Atom cost: ${totalCost} wei (${Number(totalCost) / 1e18} TRUST)`);
      return BigInt(totalCost);
    } catch (error) {
      console.error('Error getting atom cost:', error);
      // Return a reasonable default (~0.1 TRUST) if unable to fetch from contract
      return BigInt("100000000001000000");
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
   * Uses createAtoms(bytes[], uint256[]) on v1.5 mainnet
   * The second parameter is the stake/deposit amount per atom (same as atomCost)
   */
  async buildCreateAtomTransactionAsync(atomUri: string): Promise<{
    to: string;
    data: string;
    value: string;
    valueWei: bigint;
    gasLimit: string;
  }> {
    const atomCost = await this.getAtomCost();
    const iface = new ethers.Interface(INTUITION_MULTIVAULT_ABI);
    const uriBytes = ethers.toUtf8Bytes(atomUri);
    
    // createAtoms expects: bytes[] atomUris, uint256[] depositAmounts
    // The deposit amount should match the atomCost
    const atomUris = [uriBytes];
    const depositAmounts = [atomCost];
    
    const data = iface.encodeFunctionData('createAtoms', [atomUris, depositAmounts]);
    
    console.log(`Built createAtoms tx for: ${atomUri}`);
    console.log(`  Selector: ${data.slice(0, 10)}`);
    console.log(`  Deposit: ${atomCost.toString()} wei (${Number(atomCost) / 1e18} TRUST)`);
    
    return {
      to: INTUITION_MULTIVAULT_ADDRESS,
      data,
      value: atomCost.toString(),
      valueWei: atomCost,
      gasLimit: '500000' // Increased gas limit for createAtoms
    };
  }

  /**
   * Synchronous version for backward compatibility (uses default atom cost)
   */
  buildCreateAtomTransaction(atomUri: string): {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
  } {
    // Use the default atom cost
    const atomCost = BigInt("100000000001000000"); // ~0.1 TRUST
    const iface = new ethers.Interface(INTUITION_MULTIVAULT_ABI);
    const uriBytes = ethers.toUtf8Bytes(atomUri);
    
    // createAtoms expects: bytes[] atomUris, uint256[] depositAmounts
    const atomUris = [uriBytes];
    const depositAmounts = [atomCost];
    
    const data = iface.encodeFunctionData('createAtoms', [atomUris, depositAmounts]);
    
    console.log(`Built createAtoms tx for: ${atomUri}`);
    console.log(`  Selector: ${data.slice(0, 10)}`);
    console.log(`  Deposit: ${atomCost.toString()} wei`);
    
    return {
      to: INTUITION_MULTIVAULT_ADDRESS,
      data,
      value: atomCost.toString(),
      gasLimit: '500000'
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
