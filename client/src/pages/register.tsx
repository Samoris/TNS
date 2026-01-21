import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Wallet,
  Shield,
  Info,
  ExternalLink,
  Globe,
  AlertTriangle,
  Plus,
  Loader2,
  Zap,
} from "lucide-react";
import { DomainSearch } from "@/components/domain-search";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, calculateDomainPrice } from "@/lib/pricing";
import { TNS_CONTROLLER_ADDRESS, TNS_BASE_REGISTRAR_ADDRESS } from "@/lib/contracts";
import { web3Service } from "@/lib/web3";
import { INTUITION_TESTNET } from "@/lib/web3";
import { ethers } from "ethers";

interface DomainSearchResult {
  name: string;
  available: boolean;
  pricing: {
    pricePerYear: string;
    tier: string;
  };
  suggestions: string[];
}

interface RegistrationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed" | "error";
}

interface CommitmentData {
  secret: string;
  commitmentHash: string;
  commitmentTx: string;
  commitmentTime: number;
}

interface KnowledgeGraphSyncState {
  status: "pending" | "syncing" | "synced" | "error";
  txHash?: string;
  error?: string;
}

export default function RegisterPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [registrationYears, setRegistrationYears] = useState<number>(1);
  const [registeredDomain, setRegisteredDomain] = useState<any>(null);
  const [commitmentData, setCommitmentData] = useState<CommitmentData | null>(null);
  const [timeUntilRegister, setTimeUntilRegister] = useState<number>(0);
  const [kgSyncState, setKgSyncState] = useState<KnowledgeGraphSyncState>({ status: "pending" });

  const { toast } = useToast();
  const {
    isConnected,
    address,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    sendTransactionWithWei,
    getExplorerUrl,
  } = useWallet();

  // Get backend data (which checks blockchain for availability)
  const domainName = selectedDomain ? selectedDomain.replace('.trust', '') : '';
  const { data: domainData, isLoading: isDomainLoading } = useQuery<DomainSearchResult>({
    queryKey: ["/api/domains/search", domainName],
    enabled: !!domainName && domainName.length >= 3,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });

  const domainError = null;

  const pricing = selectedDomain ? calculateDomainPrice(selectedDomain) : null;
  const totalCost = pricing ? pricing.totalCost(registrationYears) : "0";

  // Timer for commitment waiting period (1 minute = 60 seconds)
  const MIN_WAIT_TIME = 60;

  // Update timer countdown
  useEffect(() => {
    if (!commitmentData) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - commitmentData.commitmentTime) / 1000);
      const remaining = Math.max(0, MIN_WAIT_TIME - elapsed);
      setTimeUntilRegister(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [commitmentData]);

  const canRegister = commitmentData && timeUntilRegister === 0;

  const steps: RegistrationStep[] = [
    {
      id: "domain",
      title: "Select Domain",
      description: "Choose your .trust domain name",
      status: selectedDomain && domainData?.available ? "completed" : "active",
    },
    {
      id: "wallet",
      title: "Connect Wallet",
      description: "Connect your MetaMask wallet",
      status: !selectedDomain || !domainData?.available 
        ? "pending" 
        : isConnected && isCorrectNetwork 
        ? "completed" 
        : "active",
    },
    {
      id: "commit",
      title: "Make Commitment",
      description: "Secure your registration (Step 1 of 2)",
      status: !isConnected || !isCorrectNetwork 
        ? "pending" 
        : commitmentData 
        ? "completed" 
        : "active",
    },
    {
      id: "register",
      title: "Complete Registration",
      description: "Mint your NFT domain (Step 2 of 2)",
      status: !commitmentData 
        ? "pending" 
        : registeredDomain 
        ? "completed" 
        : canRegister
        ? "active"
        : "pending",
    },
  ];

  // Commitment mutation (Step 1) - Using ENS-style controller
  const commitmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDomain || !address) throw new Error("Missing required data");
      
      const domainName = selectedDomain.replace('.trust', '');
      console.log("Making commitment for domain (ENS-style):", domainName);
      
      // Generate secret
      const secret = web3Service.generateSecret();
      console.log("Secret generated:", secret.substring(0, 10) + "...");
      
      // Use ENS-style makeCommitmentENS which generates and submits the commitment
      const result = await web3Service.makeCommitmentENS(
        TNS_CONTROLLER_ADDRESS,
        domainName,
        address,
        secret
      );
      
      console.log("Commitment transaction:", result.txHash);
      
      return {
        secret,
        commitmentHash: result.commitment,
        commitmentTx: result.txHash,
        commitmentTime: Date.now()
      };
    },
    onSuccess: (data) => {
      setCommitmentData(data);
      setTimeUntilRegister(MIN_WAIT_TIME);
      toast({
        title: "Commitment successful!",
        description: "Please wait 1 minute before completing registration to prevent front-running.",
      });
    },
    onError: (error: any) => {
      console.error("Commitment error:", error);
      toast({
        title: "Commitment failed",
        description: error.message || "Failed to make commitment",
        variant: "destructive",
      });
    },
  });

  // Registration mutation (Step 2)
  const registrationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDomain || !address || !commitmentData) {
        throw new Error("Missing required data or commitment");
      }
      
      if (!canRegister) {
        throw new Error("Please wait for the commitment period to complete");
      }
      
      const domainName = selectedDomain.replace('.trust', '');
      
      console.log("Registering domain:", domainName, "for", registrationYears, "years");
      console.log("Total cost:", totalCost, "TRUST");
      
      try {
        // Real blockchain transaction with ERC721 NFT minting (ENS-style)
        console.log("Starting blockchain registration for:", domainName);
        console.log("Using ENS-style controller:", TNS_CONTROLLER_ADDRESS);
        
        // Calculate duration in seconds (365 days * registrationYears)
        const durationSeconds = registrationYears * 365 * 24 * 60 * 60;
        
        // Calculate cost in wei
        const costWei = ethers.parseEther(totalCost.toString());
        
        console.log("Calling ENS-style register function with commitment secret");
        console.log("Duration:", durationSeconds, "seconds");
        console.log("Cost:", totalCost, "TRUST");
        
        const txHash = await web3Service.registerDomainENS(
          TNS_CONTROLLER_ADDRESS,
          domainName,
          durationSeconds,
          commitmentData.secret,
          costWei
        );
        
        console.log("Transaction successful:", txHash);
        console.log("NFT minted for domain:", domainName);
        
        // Register domain on backend for tracking
        const response = await apiRequest("POST", "/api/domains/register", {
          name: domainName,
          owner: address,
          duration: registrationYears,
          txHash: txHash,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to register domain");
        }

        const result = await response.json();
        
        // Return domain data with real transaction info
        return {
          ...result,
          txHash: txHash,
          contractAddress: TNS_BASE_REGISTRAR_ADDRESS,
          realTransaction: true,
          isNFT: true
        };
      } catch (error: any) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      setRegisteredDomain(data.domain);
      setCommitmentData(null);
      setKgSyncState({ status: "pending" });
      toast({
        title: "🎉 NFT Domain registered successfully!",
        description: `${selectedDomain} is now yours as an ERC-721 NFT! Now syncing to Knowledge Graph...`,
      });
      
      // Automatically trigger Knowledge Graph sync
      const domainName = data.domain?.name || selectedDomain?.replace('.trust', '');
      if (domainName) {
        // Small delay to let UI update first
        setTimeout(() => {
          syncToKnowledgeGraph(domainName);
        }, 1500);
      }
    },
    onError: (error: any) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register domain",
        variant: "destructive",
      });
    },
  });

  // Knowledge Graph sync mutation
  const syncToKnowledgeGraph = async (domainName: string) => {
    setKgSyncState({ status: "syncing" });
    
    try {
      // Prepare sync transaction
      const prepareResponse = await apiRequest("POST", "/api/sync/prepare", { domainName });
      const prepareData = await prepareResponse.json();
      
      if (prepareData.alreadySynced) {
        setKgSyncState({ 
          status: "synced", 
          txHash: prepareData.txHash 
        });
        toast({
          title: "Already synced!",
          description: "This domain is already in the Knowledge Graph.",
        });
        return;
      }
      
      // Use the exact wei value to avoid precision loss
      const valueWei = prepareData.transaction.value.startsWith('0x') 
        ? BigInt(prepareData.transaction.value).toString()
        : prepareData.transaction.value;
      
      const txHash = await sendTransactionWithWei(
        prepareData.transaction.to,
        valueWei,
        prepareData.transaction.data,
        prepareData.transaction.gasLimit || "500000"
      );
      
      // Confirm the sync
      await apiRequest("POST", "/api/sync/confirm", {
        domainName,
        atomId: "0",
        txHash,
      });
      
      setKgSyncState({ status: "synced", txHash });
      toast({
        title: "Synced to Knowledge Graph!",
        description: "Your domain is now discoverable by AI agents.",
      });
    } catch (error: any) {
      console.error("Knowledge Graph sync error:", error);
      
      if (error.message?.includes("User rejected") || error.message?.includes("cancelled")) {
        setKgSyncState({ status: "pending" });
        toast({
          title: "Sync cancelled",
          description: "You can sync to the Knowledge Graph later from the Manage page.",
        });
      } else {
        setKgSyncState({ status: "error", error: error.message });
        toast({
          title: "Sync failed",
          description: error.message || "Failed to sync to Knowledge Graph",
          variant: "destructive",
        });
      }
    }
  };

  const handleDomainSelect = (domain: string, pricing: any) => {
    setSelectedDomain(domain);
    setCommitmentData(null);
    setRegisteredDomain(null);
  };

  const handleCommitment = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!isCorrectNetwork) {
      switchNetwork();
      return;
    }
    try {
      commitmentMutation.mutate();
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  const handleRegistration = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!isCorrectNetwork) {
      switchNetwork();
      return;
    }
    if (!canRegister) {
      toast({
        title: "Please wait",
        description: `Wait ${timeUntilRegister} more seconds before completing registration`,
        variant: "destructive",
      });
      return;
    }
    try {
      registrationMutation.mutate();
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Register Your .trust Domain
          </h1>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 px-4">
            Secure your Web3 identity with a decentralized domain name
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="trust-card mb-6 sm:mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 overflow-x-auto">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                      step.status === "completed"
                        ? "bg-trust-emerald text-white"
                        : step.status === "active"
                        ? "bg-trust-blue text-white"
                        : step.status === "error"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    }`}
                    data-testid={`step-${step.id}`}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-1 mx-1 sm:mx-2 ${
                        step.status === "completed"
                          ? "bg-trust-emerald"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {steps.map((step) => (
                <div key={step.id} className="text-center">
                  <h3 className="font-semibold text-sm sm:text-base">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Domain Selection */}
            <Card className="trust-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-trust-blue" />
                  Choose Your Domain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DomainSearch 
                  onDomainSelect={handleDomainSelect}
                  autoFocus={true}
                />
              </CardContent>
            </Card>

            {/* Step 2: Wallet Connection */}
            {selectedDomain && domainData?.available && !isConnected && (
              <WalletConnection onConnected={() => {}} />
            )}

            {/* Step 3: Registration (2-Step Process) */}
            {isConnected && isCorrectNetwork && !registeredDomain && selectedDomain && domainData?.available && (
              <Card className="trust-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-trust-blue" />
                    Register Domain (Secure 2-Step Process)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {!commitmentData 
                        ? "Step 1: Make a commitment to secure your registration against front-running. Step 2: Complete registration after 1 minute to mint your ERC-721 NFT."
                        : canRegister
                        ? "Step 2: Complete your registration now! Your commitment is verified and you can mint your NFT domain."
                        : `⏳ Waiting period active. You can register in ${timeUntilRegister} seconds. This prevents front-running attacks.`
                      }
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold mb-2">Registration Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Domain:</span>
                        <span className="font-mono">{selectedDomain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{registrationYears} year{registrationYears > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total cost:</span>
                        <span className="font-semibold text-trust-blue">{formatPrice(totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>NFT Type:</span>
                        <span className="font-semibold">ERC-721</span>
                      </div>
                    </div>
                  </div>

                  {commitmentData && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Commitment Status</span>
                        <CheckCircle className="h-4 w-4 text-trust-emerald" />
                      </div>
                      {!canRegister && (
                        <div className="space-y-2">
                          <Progress value={(MIN_WAIT_TIME - timeUntilRegister) / MIN_WAIT_TIME * 100} className="h-2" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Time remaining: {timeUntilRegister} seconds
                          </p>
                        </div>
                      )}
                      {canRegister && (
                        <p className="text-sm text-trust-emerald">✓ Ready to register!</p>
                      )}
                    </div>
                  )}

                  {!commitmentData ? (
                    <Button
                      onClick={handleCommitment}
                      disabled={commitmentMutation.isPending}
                      className="w-full trust-button min-h-[44px] text-sm sm:text-base"
                      data-testid="commit-button"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      <span className="truncate">{commitmentMutation.isPending ? "Making Commitment..." : "Step 1: Make Commitment"}</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRegistration}
                      disabled={!canRegister || registrationMutation.isPending}
                      className="w-full trust-button min-h-[44px] text-sm sm:text-base"
                      data-testid="register-button"
                    >
                      <Wallet className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{registrationMutation.isPending ? "Minting NFT..." : !canRegister ? `Wait ${timeUntilRegister}s...` : "Step 2: Complete Registration & Mint NFT"}</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Registration Success */}
            {registeredDomain && (
              <Card className="trust-card border-green-200 dark:border-green-800">
                <CardContent className="p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <CheckCircle className="h-16 w-16 text-trust-emerald mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Registration Successful!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>{registeredDomain.name}</strong> is now registered to your wallet
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="font-medium">Token ID</div>
                      <div className="font-mono text-xs">{registeredDomain.tokenId}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="font-medium">Expires</div>
                      <div>{new Date(registeredDomain.expirationDate).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Knowledge Graph Sync Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-trust-blue" />
                        <span className="font-medium text-gray-900 dark:text-white">Knowledge Graph Sync</span>
                      </div>
                      {kgSyncState.status === "synced" && (
                        <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                          Synced
                        </Badge>
                      )}
                      {kgSyncState.status === "syncing" && (
                        <Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                          Syncing...
                        </Badge>
                      )}
                      {kgSyncState.status === "error" && (
                        <Badge className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                          Failed
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {kgSyncState.status === "pending" && "Sync your domain to Intuition's Knowledge Graph to make it discoverable by AI agents."}
                      {kgSyncState.status === "syncing" && "Creating atom in the Knowledge Graph..."}
                      {kgSyncState.status === "synced" && "Your domain is now part of Intuition's decentralized Knowledge Graph and can be discovered by AI agents."}
                      {kgSyncState.status === "error" && `Sync failed: ${kgSyncState.error}. You can try again or sync later from the Manage page.`}
                    </p>
                    
                    {kgSyncState.status === "pending" && (
                      <Button
                        onClick={() => syncToKnowledgeGraph(registeredDomain.name)}
                        className="w-full trust-button"
                        data-testid="sync-to-kg-button"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Sync to Knowledge Graph
                      </Button>
                    )}
                    
                    {kgSyncState.status === "syncing" && (
                      <Button disabled className="w-full">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </Button>
                    )}
                    
                    {kgSyncState.status === "error" && (
                      <Button
                        onClick={() => syncToKnowledgeGraph(registeredDomain.name)}
                        variant="outline"
                        className="w-full"
                        data-testid="retry-sync-button"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Retry Sync
                      </Button>
                    )}
                    
                    {kgSyncState.status === "synced" && kgSyncState.txHash && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(`${INTUITION_TESTNET.explorerUrl}/tx/${kgSyncState.txHash}`, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Sync Transaction
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={() => window.open(getExplorerUrl(registeredDomain.txHash || ""), "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Registration TX
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://explorer.intuition.systems/address/${TNS_REGISTRY_ADDRESS}`, "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Contract
                    </Button>
                    <Button 
                      className="trust-button" 
                      size="sm"
                      onClick={() => window.location.href = "/manage"}
                      data-testid="manage-domains-button"
                    >
                      Manage Domains
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Registration Summary */}
          <div className="lg:col-span-1">
            <Card className="trust-card sticky top-6">
              <CardHeader>
                <CardTitle>Registration Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDomain && domainData?.available && (
                  <>
                    <div>
                      <Label>Domain</Label>
                      <div className="font-mono text-lg font-semibold" data-testid="summary-domain">
                        {selectedDomain}
                      </div>
                      <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                        Available
                      </Badge>
                    </div>

                    <Separator />

                    <div>
                      <Label>Registration Period</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRegistrationYears(Math.max(1, registrationYears - 1))}
                          disabled={registrationYears <= 1}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={registrationYears}
                          onChange={(e) => setRegistrationYears(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center"
                          min={1}
                          max={10}
                        />
                        <span className="text-sm">year{registrationYears > 1 ? 's' : ''}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRegistrationYears(Math.min(10, registrationYears + 1))}
                          disabled={registrationYears >= 10}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label>Pricing</Label>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Price per year:</span>
                          <span className="font-medium" data-testid="summary-price-per-year">
                            {formatPrice(pricing?.pricePerYear || "0")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Registration period:</span>
                          <span>{registrationYears} year{registrationYears > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                          <span>Total cost:</span>
                          <span className="text-trust-blue" data-testid="summary-total-cost">
                            {formatPrice(totalCost)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label>Features Included</Label>
                      <ul className="text-sm space-y-1 mt-2">
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-trust-emerald mr-2" />
                          ERC-721 NFT ownership
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-trust-emerald mr-2" />
                          Address resolution
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-trust-emerald mr-2" />
                          Subdomain creation
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-trust-emerald mr-2" />
                          Multi-resource records
                        </li>
                      </ul>
                    </div>
                  </>
                )}

                {(!selectedDomain || !domainData?.available) && (
                  <div className="text-center py-8 text-gray-500">
                    Select an available domain to see pricing details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}