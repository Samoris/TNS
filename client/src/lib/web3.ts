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
    if (!window.ethereum) {
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

  public async disconnectWallet(): Promise<void> {
    // MetaMask doesn't have a disconnect method, but we can clear the connection
    // by requesting a switch to a different account or network
    this.notifyStateChange();
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
    const valueInWei = parseFloat(value) * Math.pow(10, 18);
    const valueHex = `0x${Math.floor(valueInWei).toString(16)}`;

    const txParams = {
      from: state.address,
      to,
      value: valueHex,
      ...(data && { data }),
    };

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
}

export const web3Service = Web3Service.getInstance();
