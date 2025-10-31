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
} from "lucide-react";
import { DomainSearch } from "@/components/domain-search";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, calculateDomainPrice } from "@/lib/pricing";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI } from "@/lib/contracts";
import { web3Service } from "@/lib/web3";

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

export default function RegisterPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [registrationYears, setRegistrationYears] = useState<number>(1);
  const [registeredDomain, setRegisteredDomain] = useState<any>(null);
  const [commitmentData, setCommitmentData] = useState<CommitmentData | null>(null);
  const [timeUntilRegister, setTimeUntilRegister] = useState<number>(0);

  const { toast } = useToast();
  const {
    isConnected,
    address,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    sendTransaction,
    getExplorerUrl,
  } = useWallet();

  // Check blockchain availability in real-time
  const domainName = selectedDomain ? selectedDomain.replace('.trust', '') : '';
  const { data: blockchainAvailable, isLoading: isCheckingBlockchain } = useQuery({
    queryKey: ["blockchain-availability", domainName],
    queryFn: async () => {
      if (!domainName) return true;
      return await web3Service.checkDomainAvailability(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, domainName);
    },
    enabled: !!domainName && domainName.length >= 3,
    refetchOnWindowFocus: false,
    staleTime: 10000,
  });

  // Get backend data for pricing
  const { data: backendData, isLoading: isLoadingBackend } = useQuery<DomainSearchResult>({
    queryKey: ["/api/domains/search", domainName],
    enabled: !!domainName && domainName.length >= 3,
    refetchOnWindowFocus: false,
  });

  // Combine blockchain and backend data
  const domainData = backendData ? {
    ...backendData,
    available: blockchainAvailable ?? false // Use blockchain availability as source of truth
  } : undefined;

  const isDomainLoading = isCheckingBlockchain || isLoadingBackend;
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

  // Commitment mutation (Step 1)
  const commitmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDomain || !address) throw new Error("Missing required data");
      
      const domainName = selectedDomain.replace('.trust', '');
      console.log("Making commitment for domain:", domainName);
      
      // Generate secret and commitment hash
      const secret = web3Service.generateSecret();
      const commitmentHash = web3Service.createCommitmentHash(domainName, address, secret);
      
      console.log("Secret generated:", secret.substring(0, 10) + "...");
      console.log("Commitment hash:", commitmentHash);
      
      // Send commitment to blockchain
      const txHash = await web3Service.makeCommitment(
        TNS_REGISTRY_ADDRESS,
        TNS_REGISTRY_ABI,
        commitmentHash
      );
      
      console.log("Commitment transaction:", txHash);
      
      return {
        secret,
        commitmentHash,
        commitmentTx: txHash,
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
        // Real blockchain transaction with ERC721 NFT minting
        console.log("Starting blockchain registration for:", domainName);
        console.log("Using ERC721 NFT contract:", TNS_REGISTRY_ADDRESS);
        
        // Real blockchain registration using ethers.js with secret
        console.log("Calling smart contract register function with commitment secret");
        
        const txHash = await web3Service.registerDomain(
          TNS_REGISTRY_ADDRESS,
          TNS_REGISTRY_ABI,
          domainName,
          registrationYears,
          totalCost.toString(),
          commitmentData.secret // Pass the secret from commitment
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
          contractAddress: TNS_REGISTRY_ADDRESS,
          realTransaction: true,
          isNFT: true
        };
      } catch (error: any) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setRegisteredDomain(data.domain);
      setCommitmentData(null);
      toast({
        title: "🎉 NFT Domain registered successfully!",
        description: `${selectedDomain} is now yours as an ERC-721 NFT! Check your wallet.`,
      });
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Register Your .trust Domain
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Secure your Web3 identity with a decentralized domain name
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="trust-card mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
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
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-24 h-1 mx-2 ${
                        step.status === "completed"
                          ? "bg-trust-emerald"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {steps.map((step) => (
                <div key={step.id} className="text-center">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      className="w-full trust-button"
                      data-testid="commit-button"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {commitmentMutation.isPending ? "Making Commitment..." : "Step 1: Make Commitment"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRegistration}
                      disabled={!canRegister || registrationMutation.isPending}
                      className="w-full trust-button"
                      data-testid="register-button"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      {registrationMutation.isPending ? "Minting NFT..." : !canRegister ? `Wait ${timeUntilRegister}s...` : "Step 2: Complete Registration & Mint NFT"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Registration Success */}
            {registeredDomain && (
              <Card className="trust-card border-green-200 dark:border-green-800">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-trust-emerald mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Registration Successful!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    <strong>{registeredDomain.name}</strong> is now registered to your wallet
                  </p>
                  
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

                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => window.open(getExplorerUrl(registeredDomain.txHash || ""), "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Transaction
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`https://testnet.explorer.intuition.systems/address/${TNS_REGISTRY_ADDRESS}`, "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Contract
                    </Button>
                    <Button 
                      className="trust-button" 
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