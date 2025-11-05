import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, AlertTriangle, ExternalLink, Shield, Globe } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";

interface WalletConnectionProps {
  onConnected?: () => void;
  showNetworkInfo?: boolean;
}

export function WalletConnection({ onConnected, showNetworkInfo = true }: WalletConnectionProps) {
  const {
    isConnected,
    address,
    balance,
    isCorrectNetwork,
    isLoading,
    error,
    connectWallet,
    switchNetwork,
    formatAddress,
  } = useWallet();

  useEffect(() => {
    if (isConnected && onConnected) {
      onConnected();
    }
  }, [isConnected, onConnected]);

  if (!isConnected) {
    return (
      <Card className="trust-card">
        <CardHeader className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-trust-blue" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Connect Your Wallet</CardTitle>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 px-4">
            Connect your wallet to view and manage your TNS domains
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={connectWallet}
            disabled={isLoading}
            className="w-full trust-button min-h-[48px]"
            data-testid="connect-wallet-main"
          >
            <Wallet className="mr-2 h-4 w-4" />
            {isLoading ? "Connecting..." : "Connect MetaMask"}
          </Button>
          
          <div className="text-center text-sm text-gray-500">
            <p>Don't have MetaMask?</p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-trust-blue hover:underline inline-flex items-center"
            >
              Download MetaMask <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>

          {showNetworkInfo && (
            <div className="mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center">
                <Globe className="mr-2 h-4 w-4" />
                Network Requirements
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <div>Chain ID: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">1155</code></div>
                <div>Network: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Intuition mainnet</code></div>
                <div>Currency: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">TRUST</code></div>
                <div className="break-all">RPC URL: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">https://intuition.calderachain.xyz</code></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trust-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-trust-blue to-trust-violet rounded-xl flex items-center justify-center mr-4">
              <Wallet className="text-white h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white" data-testid="connected-address">
                Connected: {formatAddress(address!)}
              </div>
              {balance && (
                <div className="text-sm text-gray-500" data-testid="wallet-balance">
                  Balance: {balance} TRUST
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isCorrectNetwork ? (
              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Intuition Mainnet
              </Badge>
            ) : (
              <div className="space-y-2">
                <Badge variant="destructive">Wrong Network</Badge>
                <Button
                  onClick={switchNetwork}
                  disabled={isLoading}
                  size="sm"
                  className="trust-button"
                  data-testid="switch-network-button"
                >
                  Switch Network
                </Button>
              </div>
            )}
          </div>
        </div>

        {!isCorrectNetwork && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please switch to Intuition mainnet to use TNS features. We'll automatically add the network to your wallet.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
