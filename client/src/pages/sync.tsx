import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Loader2,
  Play,
  XCircle,
  Globe,
  Sparkles,
} from "lucide-react";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { INTUITION_TESTNET } from "@/lib/web3";

interface UserDomainSync {
  domainName: string;
  owner: string;
  tokenId: string;
  expirationDate: Date;
  atomUri: string;
  syncStatus: "pending" | "synced" | "failed";
  atomId: string | null;
  txHash: string | null;
  transaction: {
    to: string;
    data: string;
    value: string;
    valueEth: string;
    gasLimit?: string;
  } | null;
}

interface UserSyncResponse {
  address: string;
  totalDomains: number;
  synced: number;
  pending: number;
  atomCostWei: string;
  atomCostEth: string;
  domains: UserDomainSync[];
}

export default function SyncPage() {
  const { isConnected, address, isCorrectNetwork, sendTransactionWithWei, waitForTransaction, parseAtomIdFromReceipt } = useWallet();
  const { toast } = useToast();
  const [syncingDomain, setSyncingDomain] = useState<string | null>(null);

  const { data: userSync, isLoading, refetch } = useQuery<UserSyncResponse>({
    queryKey: ["/api/sync/user", address],
    queryFn: async () => {
      const response = await fetch(`/api/sync/user/${address}`);
      if (!response.ok) throw new Error("Failed to fetch sync status");
      return response.json();
    },
    enabled: isConnected && isCorrectNetwork && !!address,
    refetchInterval: 30000,
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
      refetch();
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
      refetch();
    },
  });

  const handleSyncDomain = async (domain: UserDomainSync) => {
    if (!isConnected || !isCorrectNetwork || !domain.transaction) {
      toast({
        title: "Cannot Sync",
        description: "Please connect your wallet to sync domains.",
        variant: "destructive",
      });
      return;
    }

    setSyncingDomain(domain.domainName);

    try {
      const valueWei = domain.transaction.value.startsWith('0x') 
        ? BigInt(domain.transaction.value).toString()
        : domain.transaction.value;
      
      const txHash = await sendTransactionWithWei(
        domain.transaction.to,
        valueWei,
        domain.transaction.data,
        domain.transaction.gasLimit || "500000"
      );

      toast({
        title: "Transaction Sent",
        description: `Creating atom for ${domain.domainName}. Waiting for confirmation...`,
      });

      const receipt = await waitForTransaction(txHash);
      let atomId = parseAtomIdFromReceipt(receipt);
      if (!atomId) {
        atomId = "pending";
      }

      await confirmSyncMutation.mutateAsync({
        domainName: domain.domainName,
        atomId,
        txHash,
      });

      toast({
        title: "Domain Synced!",
        description: `${domain.domainName} is now on Intuition's Knowledge Graph!`,
      });
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || "";
      const isUserCancelled = 
        errorMessage.includes("user rejected") ||
        errorMessage.includes("user denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        error?.code === 4001 ||
        error?.code === "ACTION_REJECTED";
      
      if (isUserCancelled) {
        toast({
          title: "Transaction Cancelled",
          description: "You can try again anytime.",
        });
      } else {
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
        return <Badge className="bg-amber-500 text-white" data-testid="status-pending"><Clock className="w-3 h-3 mr-1" /> Not Synced</Badge>;
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
            <div className="w-16 h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="h-8 w-8 text-trust-blue" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Sync to Knowledge Graph
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 px-4">
              Connect your wallet to sync your .trust domains to Intuition's decentralized Knowledge Graph
            </p>
          </div>
          <WalletConnection onConnected={() => {}} />
        </div>
      </div>
    );
  }

  const syncProgress = userSync ? (userSync.synced / Math.max(userSync.totalDomains, 1)) * 100 : 0;
  const pendingDomains = userSync?.domains.filter(d => d.syncStatus !== 'synced') || [];
  const syncedDomains = userSync?.domains.filter(d => d.syncStatus === 'synced') || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-trust-blue" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Sync Your Domains
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Add your .trust domains to Intuition's Knowledge Graph for decentralized identity and reputation
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-trust-blue mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading your domains...</p>
          </div>
        ) : !userSync || userSync.totalDomains === 0 ? (
          <Card className="trust-card">
            <CardContent className="py-12 text-center">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Domains Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don't own any .trust domains yet. Register one to get started!
              </p>
              <Button
                onClick={() => window.location.href = '/search'}
                className="trust-button"
                data-testid="search-domains-btn"
              >
                Search for Domains
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <Card className="trust-card">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-trust-blue mr-3 flex-shrink-0" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="total-domains">
                        {userSync.totalDomains}
                      </div>
                      <div className="text-sm text-gray-500">Your Domains</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="trust-card">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="synced-count">
                        {userSync.synced}
                      </div>
                      <div className="text-sm text-gray-500">Synced</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="trust-card col-span-2 sm:col-span-1">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="pending-count">
                        {userSync.pending}
                      </div>
                      <div className="text-sm text-gray-500">To Sync</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {userSync.totalDomains > 0 && (
              <Card className="trust-card mb-6">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sync Progress
                    </span>
                    <span className="text-sm text-gray-500">
                      {userSync.synced} / {userSync.totalDomains} domains
                    </span>
                  </div>
                  <Progress value={syncProgress} className="h-2" data-testid="sync-progress" />
                </CardContent>
              </Card>
            )}

            {pendingDomains.length > 0 && (
              <Card className="trust-card mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-amber-500" />
                        Domains Ready to Sync
                      </CardTitle>
                      <CardDescription>
                        Click "Sync" to add your domain to the Knowledge Graph ({userSync.atomCostEth} TRUST per domain)
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      disabled={isLoading}
                      data-testid="refresh-btn"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingDomains.map((domain) => (
                      <div
                        key={domain.domainName}
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
                          <p className="text-xs text-gray-500 mt-1 font-mono" data-testid={`atom-uri-${domain.domainName}`}>
                            Atom URI: {domain.atomUri}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-gray-500" data-testid={`cost-${domain.domainName}`}>
                            {userSync.atomCostEth} TRUST
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleSyncDomain(domain)}
                            disabled={syncingDomain !== null || !domain.transaction}
                            className="trust-button min-w-[90px]"
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
                  </div>
                </CardContent>
              </Card>
            )}

            {syncedDomains.length > 0 && (
              <Card className="trust-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                    Synced Domains
                  </CardTitle>
                  <CardDescription>
                    These domains are live on Intuition's Knowledge Graph
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {syncedDomains.map((domain) => (
                      <div
                        key={domain.domainName}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                        data-testid={`synced-domain-${domain.domainName}`}
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {domain.domainName}
                            </span>
                            {getStatusBadge("synced")}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            Atom URI: {domain.atomUri}
                          </p>
                          {domain.atomId && (
                            <p className="text-xs text-gray-500 mt-1">
                              Atom ID: {domain.atomId}
                            </p>
                          )}
                        </div>
                        {domain.txHash && (
                          <a
                            href={getExplorerUrl(domain.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-trust-blue hover:underline flex items-center text-sm"
                            data-testid={`tx-link-${domain.domainName}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Transaction
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="trust-card mt-6">
              <CardHeader>
                <CardTitle>What is Knowledge Graph Sync?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Syncing your .trust domain to Intuition's Knowledge Graph creates a permanent, decentralized record (atom) of your domain identity. This enables:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Decentralized Identity</strong> - Your domain becomes part of the semantic web</li>
                  <li><strong>Reputation Building</strong> - Others can stake on your domain to signal trust</li>
                  <li><strong>AI Discoverability</strong> - AI agents can find and verify your identity</li>
                  <li><strong>Relationship Mapping</strong> - Create verifiable connections between identities</li>
                </ul>
                <p className="text-sm">
                  The sync cost ({userSync?.atomCostEth || "~0.1"} TRUST per domain) goes towards the Intuition protocol fee for creating atoms.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
