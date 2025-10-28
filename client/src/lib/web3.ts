import { ethers } from "ethers";

export interface NetworkConfig {
  chainId: number;
  networkName: string;
  rpcUrl: string;
  currencySymbol: string;
  explorerUrl: string;
}

export const INTUITION_TESTNET: NetworkConfig = {
  chainId: 13579,
  networkName: "Intuition testnet",
  rpcUrl: "https://testnet.rpc.intuition.systems",
  currencySymbol: "TRUST",
  explorerUrl: "https://testnet.explorer.intuition.systems",
};

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (data: any) => void) => void;
      removeListener: (event: string, callback: (data: any) => void) => void;
      selectedAddress: string | null;
      chainId: string | null;
    };
  }
}

export class Web3Service {
  private static instance: Web3Service;
  private listeners: Set<(state: WalletState) => void> = new Set();
  private isManuallyDisconnected: boolean = false;

  static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", this.handleAccountsChanged.bind(this));
      window.ethereum.on("chainChanged", this.handleChainChanged.bind(this));
      window.ethereum.on("disconnect", this.handleDisconnect.bind(this));
    }
  }

  private handleAccountsChanged(accounts: string[]) {
    this.notifyStateChange();
  }

  private handleChainChanged(chainId: string) {
    this.notifyStateChange();
  }

  private handleDisconnect() {
    this.notifyStateChange();
  }

  private async notifyStateChange() {
    const state = await this.getWalletState();
    this.listeners.forEach(listener => listener(state));
  }

  public subscribe(listener: (state: WalletState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async isMetaMaskInstalled(): Promise<boolean> {
    return typeof window !== "undefined" && !!window.ethereum;
  }

  public async connectWallet(): Promise<WalletState> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      // Clear the manual disconnect flag
      this.isManuallyDisconnected = false;
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts available");
      }

      await this.switchToIntuitionNetwork();
      return await this.getWalletState();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  public async switchToIntuitionNetwork(): Promise<void> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const chainIdHex = `0x${INTUITION_TESTNET.chainId.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      // Network doesn't exist, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: INTUITION_TESTNET.networkName,
              nativeCurrency: {
                name: INTUITION_TESTNET.currencySymbol,
                symbol: INTUITION_TESTNET.currencySymbol,
                decimals: 18,
              },
              rpcUrls: [INTUITION_TESTNET.rpcUrl],
              blockExplorerUrls: [INTUITION_TESTNET.explorerUrl],
            },
          ],
        });
      } else {
        throw error;
      }
    }
  }

  public async getWalletState(): Promise<WalletState> {
    if (!window.ethereum || this.isManuallyDisconnected) {
      return {
        isConnected: false,
        address: null,
        balance: null,
        chainId: null,
        isCorrectNetwork: false,
      };
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length === 0) {
        return {
          isConnected: false,
          address: null,
          balance: null,
          chainId: null,
          isCorrectNetwork: false,
        };
      }

      const address = accounts[0];
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      const numericChainId = parseInt(chainId, 16);
      const isCorrectNetwork = numericChainId === INTUITION_TESTNET.chainId;

      let balance = null;
      if (isCorrectNetwork) {
        try {
          const balanceWei = await window.ethereum.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });
          
          // Convert from wei to TRUST (assuming 18 decimals)
          const balanceEth = parseInt(balanceWei, 16) / Math.pow(10, 18);
          balance = balanceEth.toFixed(4);
        } catch (error) {
          console.error("Failed to fetch balance:", error);
          balance = "0.0000";
        }
      }

      return {
        isConnected: true,
        address,
        balance,
        chainId: numericChainId,
        isCorrectNetwork,
      };
    } catch (error) {
      console.error("Failed to get wallet state:", error);
      return {
        isConnected: false,
        address: null,
        balance: null,
        chainId: null,
        isCorrectNetwork: false,
      };
    }
  }

  public async switchWallet(): Promise<WalletState> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      // Request permissions - this will prompt MetaMask to show account selection
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      // Get the newly selected account
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts selected");
      }

      // Ensure we're on the correct network
      await this.switchToIntuitionNetwork();
      
      // Get and return the new wallet state
      const newState = await this.getWalletState();
      
      // Notify all listeners of the state change
      this.notifyStateChange();
      
      return newState;
    } catch (error) {
      console.error("Failed to switch wallet:", error);
      throw error;
    }
  }

  public async disconnectWallet(): Promise<void> {
    // Set manual disconnect flag to prevent auto-reconnection
    this.isManuallyDisconnected = true;
    
    // Notify listeners with disconnected state
    const disconnectedState: WalletState = {
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
      isCorrectNetwork: false,
    };
    
    this.listeners.forEach(listener => listener(disconnectedState));
  }

  public async sendTransaction(to: string, value: string, data?: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected) {
      throw new Error("Wallet not connected");
    }

    if (!state.isCorrectNetwork) {
      await this.switchToIntuitionNetwork();
    }

    // Convert value to hex with proper wei conversion
    const valueInWei = Math.floor(parseFloat(value) * Math.pow(10, 18));
    const valueHex = `0x${valueInWei.toString(16)}`;

    const txParams = {
      from: state.address,
      to,
      value: valueHex,
      ...(data && { data }),
    };

    console.log("Transaction value breakdown:");
    console.log("- Original value:", value, "TRUST");
    console.log("- Value in wei:", valueInWei);
    console.log("- Value hex:", valueHex);
    console.log("- Value in ETH:", valueInWei / Math.pow(10, 18));

    console.log("Sending transaction:", txParams);

    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [txParams],
    });

    return txHash;
  }

  public async callContract(contractAddress: string, data: string): Promise<any> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    return await window.ethereum.request({
      method: "eth_call",
      params: [{
        to: contractAddress,
        data: data,
      }, "latest"],
    });
  }

  public formatAddress(address: string, chars = 4): string {
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
  }

  public getExplorerUrl(txHash: string): string {
    return `${INTUITION_TESTNET.explorerUrl}/tx/${txHash}`;
  }

  public encodeContractCall(abi: any[], functionName: string, params: any[]): string {
    // Find the function in the ABI
    const functionAbi = abi.find(item => item.name === functionName && item.type === 'function');
    if (!functionAbi) {
      throw new Error(`Function ${functionName} not found in ABI`);
    }
    
    // Generate function selector (first 4 bytes of keccak256 hash)
    const functionSignature = `${functionName}(${functionAbi.inputs.map((input: any) => input.type).join(',')})`;
    console.log("Function signature:", functionSignature);
    
    // For simplicity, we'll use the web3 encoding approach
    // In a real implementation, you'd use web3.js or ethers.js for proper encoding
    // For now, let's create a simplified version for the register function
    if (functionName === 'register' && params.length === 2) {
      // register(string,uint256) - simplified encoding
      const domain = params[0];
      const duration = params[1];
      
      // Function selector for register(string,uint256): 0x7fb6fbb6
      const selector = '0x7fb6fbb6';
      
      // Encode parameters (simplified - in practice use proper ABI encoding)
      const domainHex = this.stringToHex(domain);
      const durationHex = duration.toString(16).padStart(64, '0');
      
      return selector + '0'.repeat(56) + '40' + '0'.repeat(56) + durationHex + 
             '0'.repeat(56) + domain.length.toString(16).padStart(8, '0') + 
             domainHex + '0'.repeat((32 - (domainHex.length / 2) % 32) % 32 * 2);
    }
    
    throw new Error(`Encoding not implemented for ${functionName}`);
  }
  
  private stringToHex(str: string): string {
    return Array.from(str)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate a random secret for commit-reveal registration
   */
  public generateSecret(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Create commitment hash for domain registration (Step 1 of 2)
   */
  public createCommitmentHash(domain: string, address: string, secret: string): string {
    const normalizedDomain = domain.toLowerCase().replace('.trust', '');
    return ethers.keccak256(
      ethers.solidityPacked(
        ["string", "address", "bytes32"],
        [normalizedDomain, address, secret]
      )
    );
  }

  /**
   * Make commitment for domain registration (Step 1 of 2)
   */
  public async makeCommitment(contractAddress: string, abi: any[], commitment: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      console.log("Making commitment:", commitment);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      const tx = await contract.makeCommitment(commitment, {
        gasLimit: 100000
      });
      
      console.log("Commitment transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Commitment transaction receipt not received");
      }
      
      console.log("Commitment confirmed:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Commitment error:", error);
      throw new Error(error.message || "Failed to make commitment");
    }
  }

  /**
   * Register domain with commit-reveal scheme (Step 2 of 2)
   */
  public async registerDomain(contractAddress: string, abi: any[], domainName: string, duration: number, cost: string, secret: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      // Normalize domain name to lowercase and remove .trust extension for contract call
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      console.log("Calling contract register function with:");
      console.log("- Domain:", normalizedDomain);
      console.log("- Duration:", duration);
      console.log("- Value:", cost, "TRUST");
      console.log("- Contract:", contractAddress);
      console.log("- Secret:", secret.substring(0, 10) + "...");
      
      // Create ethers provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Parse cost to wei
      const valueWei = ethers.parseEther(cost);
      
      // Call the register function with secret
      console.log("Calling contract.register with:", normalizedDomain, duration, "secret", "value:", valueWei.toString());
      const tx = await contract.register(normalizedDomain, duration, secret, {
        value: valueWei,
        gasLimit: 300000 // Higher gas limit for NFT minting
      });
      
      console.log("Transaction sent:", tx.hash);
      console.log("Registering domain on blockchain and minting NFT...");
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }
      console.log("Transaction confirmed:", receipt.hash);
      console.log("Domain registration and NFT minting completed successfully!");
      
      // Check if there were any events emitted
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("Contract events emitted:", receipt.logs.length);
      }
      
      return receipt.hash;
    } catch (error: any) {
      console.error("Contract registration error:", error);
      
      // Enhanced error reporting
      if (error.code === 'CALL_EXCEPTION' && error.receipt && error.receipt.gasUsed < 50000) {
        throw new Error("Domain registration failed - domain may already be registered or commitment not found");
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error("Contract call failed - check commitment status and payment amount");
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error("Insufficient TRUST tokens for gas fees");
      } else if (error.message?.includes('No commitment found')) {
        throw new Error("Commitment not found - please make commitment first and wait 1 minute");
      } else if (error.message?.includes('Commitment too new')) {
        throw new Error("Please wait at least 1 minute after making commitment");
      } else if (error.message?.includes('Commitment expired')) {
        throw new Error("Commitment expired - please make a new commitment");
      } else if (error.message?.includes('Registration too soon')) {
        throw new Error("Please wait a few blocks before registering another domain");
      } else if (error.message?.includes('Domain not available')) {
        throw new Error("Domain is already registered by someone else");
      } else if (error.message?.includes('revert')) {
        const revertReason = error.reason || error.message;
        throw new Error("Contract rejected transaction - " + revertReason);
      }
      
      throw new Error(error.message || "Failed to register domain on blockchain");
    }
  }

  /**
   * Burn an expired domain NFT to make it available for re-registration
   */
  public async burnExpiredDomain(contractAddress: string, abi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      // Normalize domain name to lowercase and remove .trust extension
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      console.log("Burning expired domain:", normalizedDomain);
      
      // Create ethers provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Call burnExpiredDomain function
      const tx = await contract.burnExpiredDomain(normalizedDomain, {
        gasLimit: 200000
      });
      
      console.log("Burn transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }
      
      console.log("Domain burned successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Burn domain error:", error);
      
      if (error.message?.includes('Domain not registered')) {
        throw new Error("Domain is not registered");
      } else if (error.message?.includes('Domain not expired')) {
        throw new Error("Domain has not expired yet - cannot burn active domains");
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error("Insufficient TRUST tokens for gas fees");
      }
      
      throw new Error(error.message || "Failed to burn expired domain");
    }
  }

  /**
   * Set a domain as the primary domain for the user
   */
  public async setPrimaryDomain(contractAddress: string, abi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      // Normalize domain name to lowercase and remove .trust extension
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      console.log("Setting primary domain:", normalizedDomain);
      
      // Create ethers provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Call setPrimaryDomain function
      const tx = await contract.setPrimaryDomain(normalizedDomain, {
        gasLimit: 100000
      });
      
      console.log("Set primary domain transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }
      
      console.log("Primary domain set successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Set primary domain error:", error);
      
      if (error.message?.includes('Domain does not exist')) {
        throw new Error("Domain does not exist");
      } else if (error.message?.includes('Domain has expired')) {
        throw new Error("Domain has expired - renew it first");
      } else if (error.message?.includes('Not domain owner')) {
        throw new Error("You don't own this domain");
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error("Insufficient TRUST tokens for gas fees");
      }
      
      throw new Error(error.message || "Failed to set primary domain");
    }
  }

  /**
   * Renew/extend a domain for additional years
   */
  public async renewDomain(contractAddress: string, abi: any[], domainName: string, durationYears: number): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      // Normalize domain name to lowercase and remove .trust extension
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      console.log("Renewing domain:", normalizedDomain, "for", durationYears, "years");
      
      // Create ethers provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Calculate cost for renewal (contract expects duration in YEARS, not seconds)
      const cost = await contract.calculateCost(normalizedDomain, durationYears);
      console.log("Renewal cost:", ethers.formatEther(cost), "TRUST");
      
      // Call renew function with payment (duration in years)
      const tx = await contract.renew(normalizedDomain, durationYears, {
        value: cost,
        gasLimit: 200000
      });
      
      console.log("Renew transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }
      
      console.log("Domain renewed successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Renew domain error:", error);
      
      if (error.message?.includes('Domain does not exist')) {
        throw new Error("Domain does not exist");
      } else if (error.message?.includes('Not domain owner')) {
        throw new Error("You don't own this domain");
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error("Insufficient TRUST tokens for renewal");
      }
      
      throw new Error(error.message || "Failed to renew domain");
    }
  }

  public async checkDomainAvailability(contractAddress: string, abi: any[], domainName: string): Promise<boolean> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      // Create ethers provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      // Normalize domain name (remove .trust suffix)
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      // Call isAvailable function
      const isAvailable = await contract.isAvailable(normalizedDomain);
      console.log("Domain", normalizedDomain, "availability from blockchain:", isAvailable);
      
      return isAvailable;
    } catch (error: any) {
      console.error("Error checking domain availability:", error);
      // If we can't check, assume it's NOT available to be safe
      return false;
    }
  }

  public async getTransactionCount(contractAddress: string): Promise<number> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get transaction count (nonce) for the contract address
      const txCount = await provider.getTransactionCount(contractAddress);
      console.log(`Contract transaction count: ${txCount}`);
      
      return txCount;
    } catch (error: any) {
      console.error("Error getting transaction count:", error);
      return 0;
    }
  }

  public async getContractStats(contractAddress: string, abi: any[]): Promise<{
    totalDomains: number;
    totalValueLocked: string;
    activeUsers: number;
  }> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      // Create ethers provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get real contract balance as total value locked
      const balance = await provider.getBalance(contractAddress);
      const totalValueLocked = ethers.formatEther(balance);
      
      
      // Get real blockchain statistics by querying contract data
      let totalDomains = 0;
      let activeUsers = 0;
      
      try {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const currentBlock = await provider.getBlockNumber();
        
        // Query DomainRegistered events from contract deployment to get total count
        const filter = contract.filters.DomainRegistered();
        
        // Query in chunks to avoid timeouts
        const blockRange = 250000; // Query 250k blocks at a time for efficiency
        const maxLookback = 10000000; // Maximum 10M blocks to look back to capture full history
        let allEvents: any[] = [];
        
        for (let lookback = 0; lookback < maxLookback; lookback += blockRange) {
          try {
            const fromBlock = Math.max(0, currentBlock - lookback - blockRange);
            const toBlock = currentBlock - lookback;
            
            console.log(`Querying blocks ${fromBlock} to ${toBlock} for domain events...`);
            const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            if (events.length > 0) {
              allEvents = [...allEvents, ...events];
              console.log(`Found ${events.length} events in this range, total so far: ${allEvents.length}`);
            }
            
            // If we get fewer than 25 events in a range and we've gone back far enough, stop
            if (events.length < 25 && lookback > blockRange * 5) {
              console.log(`Low event count, stopping search. Total events found: ${allEvents.length}`);
              break;
            }
          } catch (chunkError) {
            console.log(`Error querying blocks in range:`, chunkError);
            break;
          }
        }
        
        // Use event count for total domains since we have reliable data
        totalDomains = allEvents.length;
        console.log("Using real blockchain data for total domains:", totalDomains);
        
        // Count unique domain owners for active users
        const uniqueOwners = new Set();
        allEvents.forEach(event => {
          if (event.args && event.args.owner) {
            uniqueOwners.add(event.args.owner.toLowerCase());
          }
        });
        activeUsers = uniqueOwners.size;
        
        console.log(`Real blockchain data: ${totalDomains} total domains, ${activeUsers} unique users from ${allEvents.length} events`);
        
      } catch (eventError) {
        console.log("Could not query blockchain events comprehensively:", eventError);
        // Return zeros if we can't get real data - no fake estimates
        totalDomains = 0;
        activeUsers = 0;
      }
      
      console.log("Contract stats:", { totalDomains, totalValueLocked, activeUsers });
      
      return {
        totalDomains,
        totalValueLocked,
        activeUsers,
      };
    } catch (error: any) {
      console.error("Error getting contract stats:", error);
      // Return zeros on error - no fake data
      return {
        totalDomains: 0,
        totalValueLocked: "0",
        activeUsers: 0,
      };
    }
  }

  public async getContractOwner(contractAddress: string, abi: any[]): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      // Call owner function
      const owner = await contract.owner();
      console.log("Contract owner:", owner);
      
      return owner;
    } catch (error: any) {
      console.error("Error getting contract owner:", error);
      throw error;
    }
  }

  public async getOwnerDomains(contractAddress: string, abi: any[], ownerAddress: string): Promise<any[]> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      console.log("Fetching domains for owner:", ownerAddress);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      // Call getOwnerDomains function
      const domains = await contract.getOwnerDomains(ownerAddress);
      console.log("Domains from contract:", domains);
      
      // Get detailed info for each domain
      const domainDetails = await Promise.all(
        domains.map(async (domainName: string) => {
          try {
            console.log(`Getting info for domain: ${domainName}`);
            const info = await contract.getDomainInfo(domainName);
            const [owner, tokenId, expirationTime, exists] = info;
            
            const domain = {
              id: tokenId.toString(),
              name: domainName + '.trust',
              owner,
              tokenId: tokenId.toString(),
              expirationDate: new Date(Number(expirationTime) * 1000).toISOString(),
              exists,
              pricePerYear: this.calculateDomainPrice(domainName),
              records: [],
              subdomains: []
            };
            console.log(`Domain details for ${domainName}:`, domain);
            return domain;
          } catch (error) {
            console.error(`Error getting info for domain ${domainName}:`, error);
            return null;
          }
        })
      );
      
      return domainDetails.filter(domain => domain !== null);
    } catch (error: any) {
      console.error("Error fetching owner domains:", error);
      throw error;
    }
  }

  private calculateDomainPrice(domainName: string): string {
    const length = domainName.length;
    if (length === 3) return "100";
    if (length === 4) return "70";
    return "30"; // 5+ characters
  }

  /**
   * Set the resolver contract for a domain (Registry function)
   */
  public async setResolver(registryAddress: string, registryAbi: any[], domainName: string, resolverAddress: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      console.log("Setting resolver for domain:", normalizedDomain, "to", resolverAddress);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(registryAddress, registryAbi, signer);

      const tx = await contract.setResolver(normalizedDomain, resolverAddress, {
        gasLimit: 100000
      });

      console.log("Set resolver transaction sent:", tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      console.log("Resolver set successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Set resolver error:", error);
      throw new Error(error.message || "Failed to set resolver");
    }
  }

  /**
   * Get the resolver contract address for a domain (Registry function)
   */
  public async getResolver(registryAddress: string, registryAbi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(registryAddress, registryAbi, provider);

      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const resolverAddress = await contract.resolver(normalizedDomain);

      console.log("Resolver for", normalizedDomain, ":", resolverAddress);
      return resolverAddress;
    } catch (error: any) {
      console.error("Get resolver error:", error);
      return ethers.ZeroAddress;
    }
  }

  /**
   * Set the ETH address for a domain (Resolver function)
   */
  public async setAddr(resolverAddress: string, resolverAbi: any[], domainName: string, address: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      console.log("Setting address for domain:", normalizedDomain, "to", address);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(resolverAddress, resolverAbi, signer);

      const tx = await contract.setAddr(normalizedDomain, address, {
        gasLimit: 100000
      });

      console.log("Set address transaction sent:", tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      console.log("Address set successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Set address error:", error);
      throw new Error(error.message || "Failed to set address");
    }
  }

  /**
   * Get the ETH address for a domain (Resolver function)
   */
  public async getAddr(resolverAddress: string, resolverAbi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(resolverAddress, resolverAbi, provider);

      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const address = await contract.addr(normalizedDomain);

      console.log("Address for", normalizedDomain, ":", address);
      return address;
    } catch (error: any) {
      console.error("Get address error:", error);
      return ethers.ZeroAddress;
    }
  }

  /**
   * Set a text record for a domain (Resolver function)
   */
  public async setText(resolverAddress: string, resolverAbi: any[], domainName: string, key: string, value: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      console.log("Setting text record for domain:", normalizedDomain, "key:", key, "value:", value);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(resolverAddress, resolverAbi, signer);

      const tx = await contract.setText(normalizedDomain, key, value, {
        gasLimit: 150000
      });

      console.log("Set text transaction sent:", tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      console.log("Text record set successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Set text error:", error);
      throw new Error(error.message || "Failed to set text record");
    }
  }

  /**
   * Get a text record for a domain (Resolver function)
   */
  public async getText(resolverAddress: string, resolverAbi: any[], domainName: string, key: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(resolverAddress, resolverAbi, provider);

      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const value = await contract.text(normalizedDomain, key);

      console.log("Text record for", normalizedDomain, key, ":", value);
      return value;
    } catch (error: any) {
      console.error("Get text error:", error);
      return "";
    }
  }

  /**
   * Set content hash (IPFS) for a domain (Resolver function)
   */
  public async setContenthash(resolverAddress: string, resolverAbi: any[], domainName: string, contenthash: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      console.log("Setting contenthash for domain:", normalizedDomain);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(resolverAddress, resolverAbi, signer);

      // Convert hex string to bytes if needed
      const hashBytes = contenthash.startsWith('0x') ? contenthash : '0x' + contenthash;

      const tx = await contract.setContenthash(normalizedDomain, hashBytes, {
        gasLimit: 150000
      });

      console.log("Set contenthash transaction sent:", tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      console.log("Contenthash set successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Set contenthash error:", error);
      throw new Error(error.message || "Failed to set contenthash");
    }
  }

  /**
   * Get content hash for a domain (Resolver function)
   */
  public async getContenthash(resolverAddress: string, resolverAbi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(resolverAddress, resolverAbi, provider);

      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const contenthash = await contract.contenthash(normalizedDomain);

      console.log("Contenthash for", normalizedDomain, ":", contenthash);
      return contenthash;
    } catch (error: any) {
      console.error("Get contenthash error:", error);
      return "0x";
    }
  }

  /**
   * Get all resolver data for a domain (Resolver function)
   */
  public async getResolverData(resolverAddress: string, resolverAbi: any[], domainName: string): Promise<{
    ethAddress: string;
    contentHash: string;
    textKeys: string[];
    textValues: string[];
  }> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(resolverAddress, resolverAbi, provider);

      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const data = await contract.getResolverData(normalizedDomain);

      console.log("Resolver data for", normalizedDomain, ":", data);

      return {
        ethAddress: data[0],
        contentHash: data[1],
        textKeys: data[2],
        textValues: data[3]
      };
    } catch (error: any) {
      console.error("Get resolver data error:", error);
      return {
        ethAddress: ethers.ZeroAddress,
        contentHash: "0x",
        textKeys: [],
        textValues: []
      };
    }
  }

  /**
   * Clear all resolver records for a domain (Resolver function)
   */
  public async clearRecords(resolverAddress: string, resolverAbi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      console.log("Clearing all records for domain:", normalizedDomain);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(resolverAddress, resolverAbi, signer);

      const tx = await contract.clearRecords(normalizedDomain, {
        gasLimit: 200000
      });

      console.log("Clear records transaction sent:", tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      console.log("Records cleared successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Clear records error:", error);
      throw new Error(error.message || "Failed to clear records");
    }
  }

  /**
   * Get the primary domain for an address (reverse resolution)
   */
  public async getPrimaryDomain(registryAddress: string, registryAbi: any[], ownerAddress: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(registryAddress, registryAbi, provider);

      const primaryDomain = await contract.getPrimaryDomain(ownerAddress);

      console.log("Primary domain for", ownerAddress, ":", primaryDomain);
      return primaryDomain;
    } catch (error: any) {
      console.error("Get primary domain error:", error);
      return "";
    }
  }

  /**
   * Resolve a domain to its payment address via Payment Forwarder contract
   */
  public async resolvePaymentAddress(forwarderAddress: string, forwarderAbi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(forwarderAddress, forwarderAbi, provider);

      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const paymentAddress = await contract.resolvePaymentAddress(normalizedDomain);

      console.log("Payment address for", normalizedDomain, ":", paymentAddress);
      return paymentAddress;
    } catch (error: any) {
      console.error("Resolve payment address error:", error);
      return ethers.ZeroAddress;
    }
  }

  /**
   * Send payment to a .trust domain via Payment Forwarder contract
   */
  public async sendToTrustDomain(forwarderAddress: string, forwarderAbi: any[], domainName: string, amountInTrust: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      console.log("Sending", amountInTrust, "TRUST to domain:", normalizedDomain);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(forwarderAddress, forwarderAbi, signer);

      const amountWei = ethers.parseEther(amountInTrust);

      const tx = await contract.sendToTrustDomain(normalizedDomain, {
        value: amountWei,
        gasLimit: 150000
      });

      console.log("Payment transaction sent:", tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      console.log("Payment sent successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Send payment error:", error);
      throw new Error(error.message || "Failed to send payment");
    }
  }
}

export const web3Service = Web3Service.getInstance();
