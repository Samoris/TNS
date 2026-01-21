import { ethers } from "ethers";

export interface NetworkConfig {
  chainId: number;
  networkName: string;
  rpcUrl: string;
  currencySymbol: string;
  explorerUrl: string;
}

export const INTUITION_TESTNET: NetworkConfig = {
  chainId: 1155,
  networkName: "Intuition mainnet",
  rpcUrl: "https://intuition.calderachain.xyz",
  currencySymbol: "TRUST",
  explorerUrl: "https://explorer.intuition.systems",
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

  public async sendTransaction(to: string, value: string, data?: string, gasLimit?: string): Promise<string> {
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

    const txParams: Record<string, string> = {
      from: state.address!,
      to,
      value: valueHex,
    };
    
    if (data) {
      txParams.data = data;
    }
    
    // Add gas limit to prevent high gas estimation
    if (gasLimit) {
      txParams.gas = `0x${parseInt(gasLimit).toString(16)}`;
    }

    console.log("Transaction value breakdown:");
    console.log("- Original value:", value, "TRUST");
    console.log("- Value in wei:", valueInWei);
    console.log("- Value hex:", valueHex);
    console.log("- Gas limit:", gasLimit || "auto");

    console.log("Sending transaction:", txParams);

    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [txParams],
    });

    return txHash;
  }

  /**
   * Send a transaction with value already in wei (as a decimal string)
   * This avoids precision loss from ETH-to-wei conversion
   */
  public async sendTransactionWithWei(to: string, valueWei: string, data?: string, gasLimit?: string): Promise<string> {
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

    // Convert decimal wei string to hex
    const valueHex = `0x${BigInt(valueWei).toString(16)}`;

    const txParams: Record<string, string> = {
      from: state.address!,
      to,
      value: valueHex,
    };
    
    if (data) {
      txParams.data = data;
    }
    
    if (gasLimit) {
      txParams.gas = `0x${parseInt(gasLimit).toString(16)}`;
    }

    console.log("Transaction (wei precision):");
    console.log("- Value wei:", valueWei);
    console.log("- Value hex:", valueHex);
    console.log("- Gas limit:", gasLimit || "auto");

    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [txParams],
    });

    return txHash;
  }

  /**
   * Wait for a transaction to be mined and return the receipt
   */
  public async waitForTransaction(txHash: string, maxAttempts: number = 60): Promise<any> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    console.log("Waiting for transaction to be mined:", txHash);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const receipt = await window.ethereum.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });

        if (receipt) {
          console.log("Transaction mined:", receipt);
          
          // Check if transaction was successful (status = 0x1)
          if (receipt.status === "0x1") {
            return receipt;
          } else {
            throw new Error("Transaction failed on-chain");
          }
        }
      } catch (error) {
        console.error("Error checking receipt:", error);
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error("Transaction not confirmed after timeout");
  }

  /**
   * Parse atom ID from transaction receipt logs
   * The AtomCreated event has signature: AtomCreated(address indexed creator, uint256 indexed atomId, bytes atomUri)
   */
  public parseAtomIdFromReceipt(receipt: any): string | null {
    if (!receipt.logs || receipt.logs.length === 0) {
      return null;
    }

    // AtomCreated event topic: keccak256("AtomCreated(address,uint256,bytes)")
    const atomCreatedTopic = "0x94e2d3aa8c1c72fbb8d06d0de9c8dcb0a7a51f9703d9cb4edc2a2a7b6d2b5c4f";
    
    for (const log of receipt.logs) {
      // The atomId is in the second indexed topic (topics[2])
      if (log.topics && log.topics.length >= 2) {
        // Parse the atomId from the topic (it's a uint256)
        const atomIdHex = log.topics[1];
        if (atomIdHex) {
          const atomId = parseInt(atomIdHex, 16);
          if (atomId > 0) {
            console.log("Parsed atomId from receipt:", atomId);
            return atomId.toString();
          }
        }
      }
    }

    return null;
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

  /**
   * Check domain availability using ENS-forked Controller
   */
  public async checkDomainAvailabilityENS(controllerAddress: string, domainName: string): Promise<boolean> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      const controllerAbi = ["function available(string name) view returns (bool)"];
      const contract = new ethers.Contract(controllerAddress, controllerAbi, provider);
      
      const isAvailable = await contract.available(normalizedDomain);
      console.log("Domain", normalizedDomain, "availability (ENS):", isAvailable);
      
      return isAvailable;
    } catch (error: any) {
      console.error("Error checking domain availability (ENS):", error);
      return false;
    }
  }

  public async checkDomainAvailability(contractAddress: string, abi: any[], domainName: string): Promise<boolean> {
    // Try ENS-style first
    try {
      const controllerAddress = "0x57C93D875c3D4C8e377DAE5aA7EA06d35C84d044";
      return await this.checkDomainAvailabilityENS(controllerAddress, domainName);
    } catch {
      // Fall through to legacy
    }

    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const isAvailable = await contract.isAvailable(normalizedDomain);
      console.log("Domain", normalizedDomain, "availability from blockchain:", isAvailable);
      return isAvailable;
    } catch (error: any) {
      console.error("Error checking domain availability:", error);
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
            const toBlock = Math.max(0, currentBlock - lookback);
            
            // Stop if we've already covered block 0
            if (toBlock <= 0 && fromBlock === 0) {
              console.log(`Reached block 0, stopping search. Total events found: ${allEvents.length}`);
              break;
            }
            
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

  /**
   * Get domains owned by an address using ENS-forked BaseRegistrar events
   */
  public async getOwnerDomainsENS(
    baseRegistrarAddress: string,
    ownerAddress: string
  ): Promise<any[]> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      console.log("Fetching domains for owner (ENS):", ownerAddress);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Query NameRegistered events and filter by owner
      const registrarAbi = [
        "event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires)",
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function nameExpires(uint256 id) view returns (uint256)"
      ];
      const contract = new ethers.Contract(baseRegistrarAddress, registrarAbi, provider);
      
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000000); // Look back 1M blocks
      
      // Get all NameRegistered events
      const filter = contract.filters.NameRegistered(null, ownerAddress);
      const events = await contract.queryFilter(filter, fromBlock, currentBlock);
      
      console.log("Found", events.length, "registration events for owner");
      
      // For each event, check if the owner still owns the domain
      const domains: any[] = [];
      const seenTokenIds = new Set<string>();
      
      for (const event of events) {
        try {
          const tokenId = (event as any).args[0];
          const tokenIdStr = tokenId.toString();
          
          // Skip if we've already processed this token
          if (seenTokenIds.has(tokenIdStr)) continue;
          seenTokenIds.add(tokenIdStr);
          
          // Check current owner
          const currentOwner = await contract.ownerOf(tokenId);
          if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) continue;
          
          // Get expiration
          const expires = await contract.nameExpires(tokenId);
          const expirationDate = new Date(Number(expires) * 1000);
          
          // Calculate domain name from tokenId (labelhash)
          // Note: We can't reverse the hash, so we'll fetch from backend
          domains.push({
            id: tokenIdStr,
            tokenId: tokenIdStr,
            owner: currentOwner,
            expirationDate: expirationDate.toISOString(),
            exists: true,
            pricePerYear: "30", // Default, will be updated
            records: [],
          });
        } catch (err) {
          // Token may have been burned or transferred
          continue;
        }
      }
      
      console.log("Found", domains.length, "active domains for owner");
      return domains;
    } catch (error: any) {
      console.error("Error fetching owner domains (ENS):", error);
      return [];
    }
  }

  public async getOwnerDomains(contractAddress: string, abi: any[], ownerAddress: string): Promise<any[]> {
    // Try the backend API first which has domain names
    try {
      const response = await fetch(`/api/domains/owner/${ownerAddress}`);
      if (response.ok) {
        const data = await response.json();
        if (data.domains && data.domains.length > 0) {
          console.log("Got domains from backend API:", data.domains);
          return data.domains;
        }
      }
    } catch {
      // Fall through
    }

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
   * Calculate registration cost for a domain (in TRUST tokens)
   */
  public calculateRegistrationCost(domainName: string, durationYears: number): string {
    const pricePerYear = parseFloat(this.calculateDomainPrice(domainName));
    const totalCost = pricePerYear * durationYears;
    return totalCost.toString();
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
   * Set the ETH address for a domain (Resolver function with namehash)
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
      const fullDomain = `${normalizedDomain}.trust`;
      const node = this.namehash(fullDomain);
      
      console.log("Setting address for domain:", fullDomain, "node:", node, "to", address);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const resolverAbiWithNode = ["function setAddr(bytes32 node, address addr)"];
      const contract = new ethers.Contract(resolverAddress, resolverAbiWithNode, signer);

      const tx = await contract.setAddr(node, address, {
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
   * Get the ETH address for a domain (Resolver function with namehash)
   */
  public async getAddr(resolverAddress: string, resolverAbi: any[], domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const fullDomain = `${normalizedDomain}.trust`;
      const node = this.namehash(fullDomain);
      
      console.log("Getting address for domain:", fullDomain, "node:", node);
      
      const resolverAbiWithNode = ["function addr(bytes32 node) view returns (address)"];
      const contract = new ethers.Contract(resolverAddress, resolverAbiWithNode, provider);
      const address = await contract.addr(node);

      console.log("Address for", normalizedDomain, ":", address);
      return address;
    } catch (error: any) {
      console.error("Get address error:", error);
      return ethers.ZeroAddress;
    }
  }

  /**
   * Set a text record for a domain (Resolver function with namehash)
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
      const fullDomain = `${normalizedDomain}.trust`;
      const node = this.namehash(fullDomain);
      
      console.log("Setting text record for domain:", fullDomain, "node:", node, "key:", key, "value:", value);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const resolverAbiWithNode = ["function setText(bytes32 node, string key, string value)"];
      const contract = new ethers.Contract(resolverAddress, resolverAbiWithNode, signer);

      const tx = await contract.setText(node, key, value, {
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
   * Get a text record for a domain (Resolver function with namehash)
   */
  public async getText(resolverAddress: string, resolverAbi: any[], domainName: string, key: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      const fullDomain = `${normalizedDomain}.trust`;
      const node = this.namehash(fullDomain);

      const resolverAbiWithNode = ["function text(bytes32 node, string key) view returns (string)"];
      const contract = new ethers.Contract(resolverAddress, resolverAbiWithNode, provider);
      const value = await contract.text(node, key);

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
   * Get the primary domain for an address (ENS-style reverse resolution)
   * Uses ReverseRegistrar node + Resolver name() function
   */
  public async getPrimaryDomainENS(
    resolverAddress: string,
    ownerAddress: string
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Calculate the reverse node for the address: addr.reverse
      // Reverse node format: keccak256(addr.lower + ".addr.reverse")
      const addrLabel = ownerAddress.toLowerCase().slice(2); // remove 0x
      const reverseNode = this.namehash(`${addrLabel}.addr.reverse`);
      
      console.log("Looking up reverse record for node:", reverseNode);
      
      // Query the resolver for the name record
      const resolverAbi = ["function name(bytes32 node) view returns (string)"];
      const contract = new ethers.Contract(resolverAddress, resolverAbi, provider);
      
      const primaryDomain = await contract.name(reverseNode);
      
      console.log("Primary domain for", ownerAddress, ":", primaryDomain);
      return primaryDomain || "";
    } catch (error: any) {
      // Silently handle expected errors
      if (error.code === "BAD_DATA" || error.code === "CALL_EXCEPTION") {
        return "";
      }
      console.error("Get primary domain error:", error);
      return "";
    }
  }

  /**
   * Get the primary domain for an address (legacy method - deprecated)
   */
  public async getPrimaryDomain(registryAddress: string, registryAbi: any[], ownerAddress: string): Promise<string> {
    // For legacy compatibility, try ENS-style first if we're using new contracts
    try {
      // Try ENS-style reverse resolution
      const resolverAddress = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";
      const result = await this.getPrimaryDomainENS(resolverAddress, ownerAddress);
      if (result) return result;
    } catch {
      // Fall through to legacy method
    }
    
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
      // Silently handle BAD_DATA error (contract not deployed)
      if (error.code === "BAD_DATA" && error.value === "0x") {
        return "";
      }
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

  // ============================================
  // ERC-20 TOKEN FUNCTIONS (for ENS-forked contracts)
  // ============================================

  /**
   * Get ERC-20 token balance for an address
   */
  public async getTokenBalance(tokenAddress: string, ownerAddress: string): Promise<bigint> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenAbi = ["function balanceOf(address) view returns (uint256)"];
      const contract = new ethers.Contract(tokenAddress, tokenAbi, provider);
      const balance = await contract.balanceOf(ownerAddress);
      return balance;
    } catch (error: any) {
      console.error("Error getting token balance:", error);
      return BigInt(0);
    }
  }

  /**
   * Get ERC-20 token allowance for a spender
   */
  public async getTokenAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<bigint> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenAbi = ["function allowance(address owner, address spender) view returns (uint256)"];
      const contract = new ethers.Contract(tokenAddress, tokenAbi, provider);
      const allowance = await contract.allowance(ownerAddress, spenderAddress);
      return allowance;
    } catch (error: any) {
      console.error("Error getting token allowance:", error);
      return BigInt(0);
    }
  }

  /**
   * Approve ERC-20 token spending for a contract
   */
  public async approveToken(tokenAddress: string, spenderAddress: string, amount: bigint): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      console.log("Approving TRUST token spending:");
      console.log("- Token:", tokenAddress);
      console.log("- Spender:", spenderAddress);
      console.log("- Amount:", ethers.formatEther(amount), "TRUST");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenAbi = ["function approve(address spender, uint256 amount) returns (bool)"];
      const contract = new ethers.Contract(tokenAddress, tokenAbi, signer);

      const tx = await contract.approve(spenderAddress, amount, {
        gasLimit: 60000
      });

      console.log("Approval transaction sent:", tx.hash);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Approval transaction receipt not received");
      }

      console.log("Token approval confirmed:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Token approval error:", error);
      throw new Error(error.message || "Failed to approve token spending");
    }
  }

  /**
   * Check if sufficient allowance exists, and approve if not
   */
  public async ensureTokenAllowance(tokenAddress: string, spenderAddress: string, requiredAmount: bigint): Promise<boolean> {
    const state = await this.getWalletState();
    if (!state.isConnected || !state.address) {
      throw new Error("Wallet not connected");
    }

    const currentAllowance = await this.getTokenAllowance(tokenAddress, state.address, spenderAddress);
    console.log("Current allowance:", ethers.formatEther(currentAllowance), "TRUST");
    console.log("Required amount:", ethers.formatEther(requiredAmount), "TRUST");

    if (currentAllowance >= requiredAmount) {
      console.log("Sufficient allowance already exists");
      return true;
    }

    // Approve a larger amount (10x required) to reduce future approval transactions
    const approvalAmount = requiredAmount * BigInt(10);
    await this.approveToken(tokenAddress, spenderAddress, approvalAmount);
    return true;
  }

  /**
   * Register domain using new ENS-forked controller with native TRUST token
   * This is the Step 2 (reveal) of commit-reveal for ENS-forked contracts
   * 
   * IMPORTANT: TRUST is the native token on Intuition (like ETH on Ethereum)
   * The user sends TRUST directly with the transaction (payable function)
   * No ERC-20 approval is needed.
   */
  public async registerDomainENS(
    controllerAddress: string,
    domainName: string,
    durationSeconds: number,
    secret: string,
    cost: bigint,
    ownerAddress?: string
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork || !state.address) {
      throw new Error("Wallet not connected or wrong network");
    }

    // Use provided owner address or fall back to connected wallet
    const owner = ownerAddress || state.address;

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      // Compute what the commitment should be to verify it matches
      const label = ethers.keccak256(ethers.toUtf8Bytes(normalizedDomain));
      const expectedCommitment = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "bytes32"],
          [label, owner, secret]
        )
      );
      
      console.log("Registering domain via ENS-forked controller (native TRUST payment):");
      console.log("- Domain:", normalizedDomain);
      console.log("- Owner:", owner);
      console.log("- Duration:", durationSeconds, "seconds");
      console.log("- Cost:", ethers.formatEther(cost), "TRUST");
      console.log("- Secret:", secret.substring(0, 10) + "...");
      console.log("- Expected commitment:", expectedCommitment);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Use the correct ABI - register is payable (sends native TRUST)
      const controllerAbi = [
        "function register(string name, address owner, uint256 duration, bytes32 secret) payable"
      ];
      const contract = new ethers.Contract(controllerAddress, controllerAbi, signer);

      // Send native TRUST with the transaction
      const tx = await contract.register(
        normalizedDomain,
        owner,
        durationSeconds,
        secret,
        { value: cost, gasLimit: 400000 }
      );

      console.log("Registration transaction sent:", tx.hash);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Registration transaction receipt not received");
      }

      console.log("Domain registration confirmed:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("ENS registration error:", error);
      
      if (error.message?.includes('Commitment not found')) {
        throw new Error("Commitment not found - please make commitment first and wait 1 minute");
      } else if (error.message?.includes('Commitment too new')) {
        throw new Error("Please wait at least 1 minute after making commitment");
      } else if (error.message?.includes('Commitment expired')) {
        throw new Error("Commitment expired - please make a new commitment");
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error("Insufficient TRUST balance for registration");
      }
      
      throw new Error(error.message || "Failed to register domain");
    }
  }

  /**
   * Make commitment for ENS-forked controller (Step 1 of commit-reveal)
   */
  public async makeCommitmentENS(
    controllerAddress: string,
    domainName: string,
    ownerAddress: string,
    secret: string
  ): Promise<{ commitment: string; txHash: string }> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Compute commitment hash locally (matches contract's makeCommitment function)
      // commitment = keccak256(abi.encode(keccak256(name), owner, secret))
      const label = ethers.keccak256(ethers.toUtf8Bytes(normalizedDomain));
      const commitment = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "bytes32"],
          [label, ownerAddress, secret]
        )
      );

      console.log("Generated commitment locally:", commitment);
      console.log("Label hash:", label);
      console.log("Owner address used:", ownerAddress);
      console.log("Secret used:", secret);

      // Submit the commitment on-chain
      const controllerAbi = [
        "function commit(bytes32 commitment)"
      ];
      const contract = new ethers.Contract(controllerAddress, controllerAbi, signer);
      
      const tx = await contract.commit(commitment, { gasLimit: 100000 });
      console.log("Commitment transaction sent:", tx.hash);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Commitment transaction receipt not received");
      }

      console.log("Commitment confirmed:", receipt.hash);
      return { commitment, txHash: receipt.hash };
    } catch (error: any) {
      console.error("ENS commitment error:", error);
      throw new Error(error.message || "Failed to make commitment");
    }
  }

  /**
   * Renew domain using ENS-forked controller with native TRUST token
   */
  public async renewDomainENS(controllerAddress: string, domainName: string, durationSeconds: number, cost: bigint): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      console.log("Renewing domain via ENS-forked controller (native TRUST payment):");
      console.log("- Domain:", normalizedDomain);
      console.log("- Duration:", durationSeconds, "seconds");
      console.log("- Cost:", ethers.formatEther(cost), "TRUST");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const controllerAbi = ["function renew(string name, uint256 duration) payable"];
      const contract = new ethers.Contract(controllerAddress, controllerAbi, signer);

      // Send native TRUST with the transaction
      const tx = await contract.renew(normalizedDomain, durationSeconds, { value: cost, gasLimit: 150000 });

      console.log("Renewal transaction sent:", tx.hash);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Renewal transaction receipt not received");
      }

      console.log("Domain renewal confirmed:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("ENS renewal error:", error);
      if (error.message?.includes('insufficient funds')) {
        throw new Error("Insufficient TRUST balance for renewal");
      }
      throw new Error(error.message || "Failed to renew domain");
    }
  }

  /**
   * Set primary name via reverse registrar (ENS-forked)
   */
  public async setPrimaryNameENS(reverseRegistrarAddress: string, domainName: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const state = await this.getWalletState();
    if (!state.isConnected || !state.isCorrectNetwork) {
      throw new Error("Wallet not connected or wrong network");
    }

    try {
      const fullDomainName = domainName.endsWith('.trust') ? domainName : `${domainName}.trust`;
      
      console.log("Setting primary name via reverse registrar:", fullDomainName);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const reverseAbi = ["function setName(string name) returns (bytes32)"];
      const contract = new ethers.Contract(reverseRegistrarAddress, reverseAbi, signer);

      const tx = await contract.setName(fullDomainName, { gasLimit: 100000 });

      console.log("Set primary name transaction sent:", tx.hash);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Set primary name transaction receipt not received");
      }

      console.log("Primary name set successfully:", receipt.hash);
      return receipt.hash;
    } catch (error: any) {
      console.error("Set primary name error:", error);
      throw new Error(error.message || "Failed to set primary name");
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
   * Get rent price from ENS-forked controller
   * Returns the cost in native TRUST (wei units)
   */
  public async getRentPriceENS(controllerAddress: string, domainName: string, durationSeconds: number): Promise<bigint> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      const normalizedDomain = domainName.toLowerCase().replace('.trust', '');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const controllerAbi = [
        "function rentPrice(string name, uint256 duration) view returns (tuple(uint256 base, uint256 premium))"
      ];
      const contract = new ethers.Contract(controllerAddress, controllerAbi, provider);

      const priceInfo = await contract.rentPrice(normalizedDomain, durationSeconds);
      const totalCost = priceInfo.base + priceInfo.premium;
      
      console.log("Rent price for", normalizedDomain, ":", ethers.formatEther(totalCost), "TRUST");
      return totalCost;
    } catch (error: any) {
      console.error("Error getting rent price:", error);
      throw new Error(error.message || "Failed to get rent price");
    }
  }
}

export const web3Service = Web3Service.getInstance();
