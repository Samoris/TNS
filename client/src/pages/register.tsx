import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Shield,
  Globe,
  ArrowRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import { DomainSearch } from "@/components/domain-search";
import { WalletConnection } from "@/components/wallet-connection";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice, calculateDomainPrice } from "@/lib/pricing";
// Removed Node.js crypto import - will use Web Crypto API

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

export default function RegisterPage() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialDomain = urlParams.get('domain') || '';

  const [selectedDomain, setSelectedDomain] = useState(initialDomain);
  const [registrationYears, setRegistrationYears] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [commitmentData, setCommitmentData] = useState<{
    commitment: string;
    secret: string;
    revealAfter: Date;
  } | null>(null);
  const [registeredDomain, setRegisteredDomain] = useState<any>(null);

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

  // Domain availability check
  const { data: domainData, isLoading: isDomainLoading, error: domainError } = useQuery<DomainSearchResult>({
    queryKey: ["/api/domains/search", selectedDomain ? selectedDomain.replace('.trust', '') : ''],
    enabled: !!selectedDomain && selectedDomain.length >= 3,
    refetchOnWindowFocus: false,
  });

  const pricing = selectedDomain ? calculateDomainPrice(selectedDomain) : null;
  const totalCost = pricing ? pricing.totalCost(registrationYears) : "0";

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
      title: "Commit Registration",
      description: "Submit commitment transaction",
      status: !isConnected || !isCorrectNetwork 
        ? "pending" 
        : commitmentData 
        ? "completed" 
        : "active",
    },
    {
      id: "reveal",
      title: "Reveal & Register",
      description: "Complete domain registration",
      status: !commitmentData 
        ? "pending" 
        : registeredDomain 
        ? "completed" 
        : "active",
    },
  ];

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDomain || !address) throw new Error("Missing required data");
      
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const domainName = selectedDomain.replace('.trust', '');
      
      // Create commitment hash using Web Crypto API
      const dataToHash = `${domainName}${address}${registrationYears}${secret}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(dataToHash);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const commitment = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Step 1: Send blockchain transaction for commitment
      const commitTx = await sendTransaction(
        "0x1234567890123456789012345678901234567890", // TNS Registry contract
        "0", // No payment for commitment
        `0x${Array.from(new TextEncoder().encode(`commit:${commitment}`))
          .map(b => b.toString(16).padStart(2, '0')).join('')}`
      );

      console.log("Commitment transaction sent:", commitTx);

      // Step 2: Record commitment in backend
      const response = await apiRequest("POST", "/api/domains/commit", {
        commitment,
        name: domainName,
        owner: address,
        duration: registrationYears,
        secret,
        txHash: commitTx,
      });

      const result = await response.json();
      return { ...result, secret, commitment };
    },
    onSuccess: (data) => {
      setCommitmentData({
        commitment: data.commitment,
        secret: data.secret,
        revealAfter: new Date(data.revealAfter),
      });
      toast({
        title: "Commitment submitted",
        description: "Your domain registration has been committed. Wait 1 minute before revealing.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Commitment failed",
        description: error.message || "Failed to commit domain registration",
        variant: "destructive",
      });
    },
  });

  // Reveal mutation
  const revealMutation = useMutation({
    mutationFn: async () => {
      if (!commitmentData || !selectedDomain || !address) {
        throw new Error("Missing commitment data");
      }

      const domainName = selectedDomain.replace('.trust', '');
      
      // Step 1: Send blockchain transaction for domain registration
      const registrationTx = await sendTransaction(
        "0x1234567890123456789012345678901234567890", // TNS Registry contract
        totalCost,
        `0x${Array.from(new TextEncoder().encode(`reveal:${commitmentData.commitment}`))
          .map(b => b.toString(16).padStart(2, '0')).join('')}`
      );

      console.log("Registration transaction sent:", registrationTx);
      
      // Step 2: Complete registration on backend
      const response = await apiRequest("POST", "/api/domains/reveal", {
        commitment: commitmentData.commitment,
        name: domainName,
        owner: address,
        duration: registrationYears,
        secret: commitmentData.secret,
        txHash: registrationTx,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reveal domain");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setRegisteredDomain(data.domain);
      toast({
        title: "Domain registered successfully!",
        description: `${selectedDomain} is now yours. Check your wallet for the NFT.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to complete domain registration",
        variant: "destructive",
      });
    },
  });

  const handleDomainSelect = (domain: string, pricing: any) => {
    setSelectedDomain(domain);
  };

  const handleCommit = () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!isCorrectNetwork) {
      switchNetwork();
      return;
    }
    commitMutation.mutate();
  };

  const handleReveal = () => {
    if (!commitmentData) return;
    
    const now = new Date();
    if (now < commitmentData.revealAfter) {
      toast({
        title: "Please wait",
        description: "You must wait at least 1 minute before revealing",
        variant: "destructive",
      });
      return;
    }
    
    revealMutation.mutate();
  };

  const canReveal = commitmentData && new Date() >= commitmentData.revealAfter;
  const timeRemaining = commitmentData ? Math.max(0, commitmentData.revealAfter.getTime() - Date.now()) : 0;

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
                  <div className="ml-3 text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Registration Flow */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Domain Selection */}
            {(!selectedDomain || !domainData?.available) && (
              <Card className="trust-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="mr-2 h-5 w-5 text-trust-blue" />
                    Choose Your Domain
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DomainSearch onDomainSelect={handleDomainSelect} />
                  {domainError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>Failed to check domain availability</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Wallet Connection */}
            {selectedDomain && domainData?.available && (!isConnected || !isCorrectNetwork) && (
              <WalletConnection onConnected={() => {}} />
            )}

            {/* Step 3: Commit Phase */}
            {selectedDomain && domainData?.available && isConnected && isCorrectNetwork && !commitmentData && (
              <Card className="trust-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-trust-blue" />
                    Commit Registration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="years">Registration Period</Label>
                    <select
                      id="years"
                      value={registrationYears}
                      onChange={(e) => setRegistrationYears(parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      data-testid="registration-years"
                    >
                      {[1, 2, 3, 4, 5].map(year => (
                        <option key={year} value={year}>
                          {year} year{year > 1 ? 's' : ''} - {formatPrice((parseFloat(pricing?.pricePerYear || "0") * year).toString())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      The commit-reveal process prevents front-running. First, you commit to register 
                      the domain, then after 1 minute you can reveal and complete the registration.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleCommit}
                    disabled={commitMutation.isPending}
                    className="w-full trust-button"
                    data-testid="commit-button"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {commitMutation.isPending ? "Committing..." : "Commit Registration"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Reveal Phase */}
            {commitmentData && !registeredDomain && (
              <Card className="trust-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-trust-violet" />
                    Reveal Registration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!canReveal ? (
                    <div className="text-center py-6">
                      <Clock className="h-12 w-12 text-trust-violet mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Waiting Period</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Please wait {Math.ceil(timeRemaining / 1000)} seconds before revealing
                      </p>
                      <Progress value={Math.max(0, 100 - (timeRemaining / 60000) * 100)} className="w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Your commitment period has ended. You can now reveal and complete the registration.
                        </AlertDescription>
                      </Alert>

                      <Button
                        onClick={handleReveal}
                        disabled={revealMutation.isPending}
                        className="w-full trust-button"
                        data-testid="reveal-button"
                      >
                        {revealMutation.isPending ? "Registering..." : "Complete Registration"}
                      </Button>
                    </div>
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
                    <Button variant="outline" onClick={() => window.open(getExplorerUrl(""), "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Explorer
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
