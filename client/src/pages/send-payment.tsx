import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { web3Service } from "@/lib/web3";
import { TNS_PAYMENT_FORWARDER_ADDRESS, TNS_PAYMENT_FORWARDER_ABI } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { ethers } from "ethers";

export default function SendPayment() {
  const { toast } = useToast();
  const [domainInput, setDomainInput] = useState("");
  const [amount, setAmount] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // Query for wallet state
  const { data: walletState } = useQuery({
    queryKey: ['/api/wallet-state'],
    queryFn: async () => {
      const state = await web3Service.getWalletState();
      return state;
    },
    refetchInterval: 1000,
  });

  // Query for resolving payment address when domain input changes
  const { data: paymentAddress, isLoading: isResolving, refetch: resolveAddress } = useQuery({
    queryKey: ['/api/resolve-payment', domainInput],
    queryFn: async () => {
      if (!domainInput.trim()) return null;
      
      const normalizedDomain = domainInput.toLowerCase().replace('.trust', '');
      const address = await web3Service.resolvePaymentAddress(
        TNS_PAYMENT_FORWARDER_ADDRESS,
        TNS_PAYMENT_FORWARDER_ABI,
        normalizedDomain
      );
      
      if (address === ethers.ZeroAddress) {
        return null;
      }
      
      setResolvedAddress(address);
      return address;
    },
    enabled: false, // Manual trigger only
  });

  // Mutation for sending payment
  const sendPaymentMutation = useMutation({
    mutationFn: async () => {
      const normalizedDomain = domainInput.toLowerCase().replace('.trust', '');
      const txHash = await web3Service.sendToTrustDomain(
        TNS_PAYMENT_FORWARDER_ADDRESS,
        TNS_PAYMENT_FORWARDER_ABI,
        normalizedDomain,
        amount
      );
      return txHash;
    },
    onSuccess: (txHash) => {
      toast({
        title: "Payment Sent!",
        description: `Successfully sent ${amount} TRUST to ${domainInput}`,
      });
      
      // Reset form
      setDomainInput("");
      setAmount("");
      setResolvedAddress(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.message || "Failed to send payment",
      });
    },
  });

  const handleResolve = () => {
    if (!domainInput.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a domain name",
      });
      return;
    }
    
    resolveAddress();
  };

  const handleSendPayment = () => {
    if (!domainInput.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a domain name",
      });
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
      });
      return;
    }

    if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
      toast({
        variant: "destructive",
        title: "Resolve Domain First",
        description: "Please resolve the domain before sending payment",
      });
      return;
    }

    try {
      sendPaymentMutation.mutate();
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Send Payment
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Send TRUST tokens directly to .trust domain names
          </p>
        </div>

        <Card className="shadow-lg border-2 border-blue-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl">Send to Domain</CardTitle>
            <CardDescription>
              Enter a .trust domain name and amount to send payment on-chain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Domain Input */}
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-base font-medium">
                Recipient Domain
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="domain"
                    type="text"
                    placeholder="samoris.trust"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      setResolvedAddress(null);
                    }}
                    className="text-lg"
                    data-testid="input-domain"
                  />
                </div>
                <Button
                  onClick={handleResolve}
                  disabled={!domainInput.trim() || isResolving || !walletState?.isConnected}
                  variant="outline"
                  data-testid="button-resolve"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resolving
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Resolve
                    </>
                  )}
                </Button>
              </div>
              {!domainInput.includes('.trust') && domainInput.trim() && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tip: You can omit the .trust extension
                </p>
              )}
            </div>

            {/* Resolved Address Display */}
            {resolvedAddress && resolvedAddress !== ethers.ZeroAddress && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Domain Resolved
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 font-mono mt-1 break-all" data-testid="text-resolved-address">
                      {resolvedAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paymentAddress === null && !isResolving && domainInput.trim() && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-900 dark:text-red-100">
                  Domain not found or expired
                </p>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-medium">
                Amount (TRUST)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
                data-testid="input-amount"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Gas fees will be added to this amount
                </p>
              )}
            </div>

            {/* Wallet Connection Warning */}
            {!walletState?.isConnected && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  Please connect your wallet to send payments
                </p>
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSendPayment}
              disabled={
                !walletState?.isConnected ||
                !domainInput.trim() ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !resolvedAddress ||
                resolvedAddress === ethers.ZeroAddress ||
                sendPaymentMutation.isPending
              }
              className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              data-testid="button-send-payment"
            >
              {sendPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending Payment...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send {amount || "0"} TRUST
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="mt-6 border-2 border-gray-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                1
              </div>
              <p>Enter the recipient's .trust domain name</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                2
              </div>
              <p>Click "Resolve" to verify the domain and get the payment address</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                3
              </div>
              <p>Enter the amount of TRUST tokens you want to send</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                4
              </div>
              <p>Confirm the transaction in MetaMask to complete the payment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
