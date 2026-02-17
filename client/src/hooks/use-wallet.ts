import { useState, useEffect } from "react";
import { web3Service, type WalletState } from "@/lib/web3";

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    isCorrectNetwork: false,
    providerType: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [web3AuthAvailable, setWeb3AuthAvailable] = useState(false);
  const [effectiveAddress, setEffectiveAddress] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        const state = await web3Service.getWalletState();
        setWalletState(state);
        const available = await web3Service.isWeb3AuthAvailable();
        setWeb3AuthAvailable(available);
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeWallet();

    const unsubscribe = web3Service.subscribe(setWalletState);

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const resolveAddress = async () => {
      if (!walletState.isConnected || !walletState.address) {
        setEffectiveAddress(null);
        return;
      }
      if (walletState.providerType === 'web3auth') {
        try {
          const res = await fetch(`/api/linked-accounts/resolve/${walletState.address}`);
          if (res.ok) {
            const data = await res.json();
            setEffectiveAddress(data.linked ? data.primaryAddress : walletState.address);
          } else {
            setEffectiveAddress(walletState.address);
          }
        } catch {
          setEffectiveAddress(walletState.address);
        }
      } else {
        setEffectiveAddress(walletState.address);
      }
    };
    resolveAddress();
  }, [walletState.isConnected, walletState.address, walletState.providerType]);

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

  const connectWithWeb3Auth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const state = await web3Service.connectWithWeb3Auth();
      setWalletState(state);
    } catch (error: any) {
      console.error("Failed to connect with social login:", error);
      setError(error.message || "Failed to connect with social login");
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

  const switchAccount = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const state = await web3Service.switchAccount();
      setWalletState(state);
    } catch (error: any) {
      console.error("Failed to switch account:", error);
      setError(error.message || "Failed to switch account");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTransaction = async (to: string, value: string, data?: string, gasLimit?: string) => {
    try {
      if (!walletState.isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!walletState.isCorrectNetwork) {
        await switchNetwork();
      }

      return await web3Service.sendTransaction(to, value, data, gasLimit);
    } catch (error: any) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  const sendTransactionWithWei = async (to: string, valueWei: string, data?: string, gasLimit?: string) => {
    try {
      if (!walletState.isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!walletState.isCorrectNetwork) {
        await switchNetwork();
      }

      return await web3Service.sendTransactionWithWei(to, valueWei, data, gasLimit);
    } catch (error: any) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  const waitForTransaction = async (txHash: string) => {
    return await web3Service.waitForTransaction(txHash);
  };

  const parseAtomIdFromReceipt = (receipt: any) => {
    return web3Service.parseAtomIdFromReceipt(receipt);
  };

  return {
    ...walletState,
    effectiveAddress,
    isInitializing,
    isLoading,
    error,
    web3AuthAvailable,
    connectWallet,
    connectWithWeb3Auth,
    switchWallet,
    switchAccount,
    disconnectWallet,
    switchNetwork,
    sendTransaction,
    sendTransactionWithWei,
    waitForTransaction,
    parseAtomIdFromReceipt,
    formatAddress: web3Service.formatAddress,
    getExplorerUrl: web3Service.getExplorerUrl,
  };
}
