import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Database,
  Zap,
  ExternalLink,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { INTUITION_TESTNET } from "@/lib/web3";

interface SyncStatus {
  totalDomains: number;
  synced: number;
  pending: number;
  failed: number;
  atomCostWei: string;
  atomCostEth: string;
  domains: DomainSyncStatus[];
}

interface DomainSyncStatus {
  id: string;
  domainName: string;
  atomUri: string;
  syncStatus: "pending" | "synced" | "failed";
  syncedAt: string | null;
  atomId: string | null;
  txHash: string | null;
  errorMessage: string | null;
}

interface PendingDomain extends DomainSyncStatus {
  transaction: {
    to: string;
    data: string;
    value: string;
    valueEth: string;
    gasLimit?: string;
  };
}

interface PendingDomainsResponse {
  count: number;
  totalCostWei: string;
  totalCostEth: string;
  domains: PendingDomain[];
}

const ADMIN_WALLET_ADDRESS = (import.meta.env.VITE_ADMIN_WALLET_ADDRESS || "").toLowerCase();

export default function SyncPage() {
  const { isConnected, address, isCorrectNetwork, sendTransaction, waitForTransaction, parseAtomIdFromReceipt } = useWallet();
  const { toast } = useToast();
  const [syncingDomain, setSyncingDomain] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState({ current: 0, total: 0 });

  const isAdmin = address?.toLowerCase() === ADMIN_WALLET_ADDRESS;

  const { data: syncStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    enabled: isConnected && isCorrectNetwork,
    refetchInterval: 10000,
  });

  const { data: pendingDomains, isLoading: isLoadingPending, refetch: refetchPending } = useQuery<PendingDomainsResponse>({
    queryKey: ["/api/sync/pending"],
    enabled: isConnected && isCorrectNetwork,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      const response = await apiRequest("POST", "/api/sync/scan");
      return response.json();
    },
    onSuccess: (data) => {
      setIsScanning(false);
      toast({
        title: "Scan Complete",
        description: `Found ${data.totalDomains} domains. ${data.pending} pending sync.`,
      });
      refetchStatus();
      refetchPending();
    },
    onError: (error: Error) => {
      setIsScanning(false);
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmSyncMutation = useMutation({
    mutationFn: async ({ domainName, atomId, txHash }: { domainName: string; atomId: string; txHash: string }) => {
      const response = await apiRequest("POST", "/api/sync/confirm", {
        domainName,
        atomId,
        txHash,
      });
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      refetchPending();
    },
  });

  const failSyncMutation = useMutation({
    mutationFn: async ({ domainName, errorMessage }: { domainName: string; errorMessage: string }) => {
      const response = await apiRequest("POST", "/api/sync/fail", {
        domainName,
        errorMessage,
      });
      return response.json();
    },
    onSuccess: () => {
      refetchStatus();
      refetchPending();
    },
  });

  const handleSyncAll = async () => {
    if (!pendingDomains || pendingDomains.count === 0) {
      toast({
        title: "No Domains to Sync",
        description: "All domains are already synced.",
      });
      return;
    }

    setIsSyncingAll(true);
    setSyncAllProgress({ current: 0, total: pendingDomains.domains.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingDomains.domains.length; i++) {
      const domain = pendingDomains.domains[i];
      setSyncAllProgress({ current: i + 1, total: pendingDomains.domains.length });
      setSyncingDomain(domain.domainName);

      try {
        const valueInEth = domain.transaction.valueEth || 
          (domain.transaction.value ? 
            (parseInt(domain.transaction.value.replace('0x', ''), 16) / Math.pow(10, 18)).toString() : 
            "0");
        
        const txHash = await sendTransaction(
          domain.transaction.to,
          valueInEth,
          domain.transaction.data
        );

        await confirmSyncMutation.mutateAsync({
          domainName: domain.domainName,
          atomId: "0",
          txHash,
        });

        successCount++;
      } catch (error: any) {
        console.error(`Failed to sync ${domain.domainName}:`, error);
        
        if (error.message?.includes("User rejected") || error.message?.includes("cancelled")) {
          toast({
            title: "Sync Cancelled",
            description: `Stopped at ${domain.domainName}. ${successCount} domains synced successfully.`,
          });
          break;
        }

        await failSyncMutation.mutateAsync({
          domainName: domain.domainName,
          errorMessage: error.message || "Transaction failed",
        });
        failCount++;
      }
    }

    setIsSyncingAll(false);
    setSyncingDomain(null);
    refetchStatus();
    refetchPending();

    toast({
      title: "Sync Complete",
      description: `${successCount} domains synced successfully. ${failCount} failed.`,
    });
  };

  const handleSyncDomain = async (domain: PendingDomain) => {
    if (!isConnected || !isCorrectNetwork) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to sync domains.",
        variant: "destructive",
      });
      return;
    }

    setSyncingDomain(domain.domainName);

    try {
      const valueInEth = domain.transaction.valueEth || 
        (domain.transaction.value ? 
          (parseInt(domain.transaction.value.replace('0x', ''), 16) / Math.pow(10, 18)).toString() : 
          "0");
      
      const txHash = await sendTransaction(
        domain.transaction.to,
        valueInEth,
        domain.transaction.data,
        domain.transaction.gasLimit || "250000"
      );

      toast({
        title: "Transaction Sent",
        description: `Creating atom for ${domain.domainName}. Waiting for confirmation...`,
      });

      // Wait for transaction to be mined
      const receipt = await waitForTransaction(txHash);
      console.log("Transaction receipt:", receipt);

      // Try to parse atomId from receipt logs
      let atomId = parseAtomIdFromReceipt(receipt);
      if (!atomId) {
        // If we can't parse it, use a placeholder - the backend can verify later
        console.log("Could not parse atomId from receipt, using txHash as reference");
        atomId = "pending";
      }

      await confirmSyncMutation.mutateAsync({
        domainName: domain.domainName,
        atomId,
        txHash,
      });

      toast({
        title: "Domain Synced",
        description: `${domain.domainName} has been synced to the Knowledge Graph!`,
      });
    } catch (error: any) {
      console.log("User cancelled the transaction");
      
      // Check if user cancelled the transaction
      const errorMessage = error?.message?.toLowerCase() || "";
      const isUserCancelled = 
        errorMessage.includes("user rejected") ||
        errorMessage.includes("user denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        error?.code === 4001 ||
        error?.code === "ACTION_REJECTED";
      
      if (isUserCancelled) {
        // User cancelled - just show info toast, don't mark as failed
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the sync transaction. You can try again anytime.",
        });
      } else {
        // Actual error - mark as failed
        console.error("Sync error:", error);
        
        await failSyncMutation.mutateAsync({
          domainName: domain.domainName,
          errorMessage: error.message || "Transaction failed",
        });

        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync domain",
          variant: "destructive",
        });
      }
    } finally {
      setSyncingDomain(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return <Badge className="bg-green-500 text-white" data-testid="status-synced"><CheckCircle2 className="w-3 h-3 mr-1" /> Synced</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white" data-testid="status-pending"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500 text-white" data-testid="status-failed"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `${INTUITION_TESTNET.explorerUrl}/tx/${txHash}`;
  };

  if (!isConnected || !isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Knowledge Graph Sync
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 px-4">
              Connect your wallet to sync domains to Intuition's Knowledge Graph
            </p>
          </div>
          <WalletConnection onConnected={() => {}} />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Access Denied
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              This page is only accessible to administrators.
            </p>
            <p className="text-sm text-gray-500">
              Connected wallet: {address}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const syncProgress = syncStatus ? (syncStatus.synced / Math.max(syncStatus.totalDomains, 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Knowledge Graph Sync
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Sync .trust domains to Intuition's decentralized Knowledge Graph
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={isScanning || scanMutation.isPending || isSyncingAll}
              variant="outline"
              className="w-full sm:w-auto min-h-[44px]"
              data-testid="scan-blockchain"
            >
              {isScanning || scanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scan Blockchain
                </>
              )}
            </Button>
            <Button
              onClick={handleSyncAll}
              disabled={isSyncingAll || !pendingDomains || pendingDomains.count === 0}
              className="trust-button w-full sm:w-auto min-h-[44px]"
              data-testid="sync-all"
            >
              {isSyncingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing {syncAllProgress.current}/{syncAllProgress.total}...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Sync All ({pendingDomains?.count || 0})
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="trust-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <Database className="h-6 w-6 sm:h-8 sm:w-8 text-trust-blue mr-2 sm:mr-3 flex-shrink-0" />
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" data-testid="total-domains">
                    {syncStatus?.totalDomains || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Total Domains</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" data-testid="synced-domains">
                    {syncStatus?.synced || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Synced</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" data-testid="pending-domains">
                    {syncStatus?.pending || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" data-testid="failed-domains">
                    {syncStatus?.failed || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {syncStatus && syncStatus.totalDomains > 0 && (
          <Card className="trust-card mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sync Progress
                </span>
                <span className="text-sm text-gray-500">
                  {syncStatus.synced} / {syncStatus.totalDomains} domains
                </span>
              </div>
              <Progress value={syncProgress} className="h-2" data-testid="sync-progress" />
            </CardContent>
          </Card>
        )}

        <Card className="trust-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-trust-blue" />
              Pending Domains
            </CardTitle>
            <CardDescription>
              Domains awaiting sync to the Intuition Knowledge Graph. Click "Sync" to create an atom for each domain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPending ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-trust-blue mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading pending domains...</p>
              </div>
            ) : !pendingDomains || pendingDomains.count === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  All Synced!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All domains have been synced to the Knowledge Graph.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDomains.domains.slice(0, 20).map((domain) => (
                  <div
                    key={domain.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                    data-testid={`domain-row-${domain.domainName}`}
                  >
                    <div className="flex-1 mb-3 sm:mb-0">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-gray-900 dark:text-white" data-testid={`domain-name-${domain.domainName}`}>
                          {domain.domainName}
                        </span>
                        {getStatusBadge(domain.syncStatus)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-mono truncate" data-testid={`atom-uri-${domain.domainName}`}>
                        {domain.atomUri}
                      </p>
                      {domain.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">
                          Error: {domain.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {domain.transaction.valueEth && parseFloat(domain.transaction.valueEth) > 0 && (
                        <span className="text-xs text-gray-500" data-testid={`cost-${domain.domainName}`}>
                          Cost: {domain.transaction.valueEth} TRUST
                        </span>
                      )}
                      {domain.txHash && (
                        <a
                          href={getExplorerUrl(domain.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-trust-blue hover:underline flex items-center text-sm"
                          data-testid={`tx-link-${domain.domainName}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Tx
                        </a>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSyncDomain(domain)}
                        disabled={syncingDomain !== null}
                        className="trust-button min-w-[80px]"
                        data-testid={`sync-btn-${domain.domainName}`}
                      >
                        {syncingDomain === domain.domainName ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Syncing
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Sync
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingDomains.count > 20 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Showing first 20 of {pendingDomains.count} pending domains. Sync some domains to see more.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="trust-card">
          <CardHeader>
            <CardTitle>About Knowledge Graph Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
            <p>
              The Knowledge Graph sync creates atoms in Intuition's decentralized Knowledge Graph for each .trust domain.
              This enables:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>AI agents to discover and verify .trust identities</li>
              <li>Decentralized reputation building for domains</li>
              <li>Cross-platform identity verification</li>
              <li>Integration with the broader Intuition ecosystem</li>
            </ul>
            <p className="text-sm">
              Each sync transaction creates an atom in Intuition's EthMultiVault contract. You'll need to sign a transaction
              for each domain you want to sync.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
