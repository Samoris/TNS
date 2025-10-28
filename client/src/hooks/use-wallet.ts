import { useState, useEffect } from "react";
import { web3Service, type WalletState } from "@/lib/web3";

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    isCorrectNetwork: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize wallet state
    const initializeWallet = async () => {
      try {
        const state = await web3Service.getWalletState();
        setWalletState(state);
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
      }
    };

    initializeWallet();

    // Subscribe to wallet state changes
    const unsubscribe = web3Service.subscribe(setWalletState);

    return () => {
      unsubscribe();
    };
  }, []);

  const connectWallet = async () => {
    if (!await web3Service.isMetaMaskInstalled()) {
      setError("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const state = await web3Service.connectWallet();
      setWalletState(state);
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      setError(error.message || "Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const switchNetwork = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await web3Service.switchToIntuitionNetwork();
      const state = await web3Service.getWalletState();
      setWalletState(state);
    } catch (error: any) {
      console.error("Failed to switch network:", error);
      setError(error.message || "Failed to switch network");
    } finally {
      setIsLoading(false);
    }
  };

  const switchWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const state = await web3Service.switchWallet();
      setWalletState(state);
    } catch (error: any) {
      console.error("Failed to switch wallet:", error);
      setError(error.message || "Failed to switch wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await web3Service.disconnectWallet();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const sendTransaction = async (to: string, value: string, data?: string) => {
    try {
      if (!walletState.isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!walletState.isCorrectNetwork) {
        await switchNetwork();
      }

      return await web3Service.sendTransaction(to, value, data);
    } catch (error: any) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  return {
    ...walletState,
    isLoading,
    error,
    connectWallet,
    switchWallet,
    disconnectWallet,
    switchNetwork,
    sendTransaction,
    formatAddress: web3Service.formatAddress,
    getExplorerUrl: web3Service.getExplorerUrl,
  };
}
