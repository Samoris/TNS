import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { web3Service } from "@/lib/web3";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, Unlink, Shield, Wallet, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { LinkedAccount } from "@shared/schema";

type LinkingStep = "idle" | "connecting-social" | "signing-primary" | "signing-social" | "verifying" | "done" | "error";

export default function LinkAccounts() {
  const { isConnected, address, providerType, isInitializing } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkingStep, setLinkingStep] = useState<LinkingStep>("idle");
  const [stepError, setStepError] = useState<string | null>(null);

  const { data: linkedAccounts = [], isLoading: loadingLinks } = useQuery<LinkedAccount[]>({
    queryKey: ["/api/linked-accounts/by-primary", address],
    enabled: isConnected && !!address && providerType !== "web3auth",
  });

  const { data: resolvedLink } = useQuery<{ primaryAddress: string; linked: boolean }>({
    queryKey: ["/api/linked-accounts/resolve", address],
    enabled: isConnected && !!address && providerType === "web3auth",
  });

  const unlinkMutation = useMutation({
    mutationFn: async (socialAddress: string) => {
      const challengeRes = await apiRequest("POST", "/api/linked-accounts/unlink-challenge", {
        primaryAddress: address,
        socialAddress,
      });
      const { nonce, message } = await challengeRes.json();

      const provider = web3Service.getProvider();
      if (!provider) throw new Error("No provider");
      const { ethers } = await import("ethers");
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const signature = await signer.signMessage(message);

      await apiRequest("DELETE", `/api/linked-accounts/${socialAddress}`, {
        signature,
        primaryAddress: address,
        nonce,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linked-accounts/by-primary", address] });
      toast({ title: "Account Unlinked", description: "Social account has been disconnected from your wallet." });
    },
    onError: (error: any) => {
      toast({ title: "Unlink Failed", description: error.message, variant: "destructive" });
    },
  });

  const startLinking = async () => {
    if (!address || !isConnected) {
      toast({ title: "Connect Wallet First", description: "Please connect your wallet before linking social accounts.", variant: "destructive" });
      return;
    }
    if (providerType === "web3auth") {
      toast({ title: "Use MetaMask", description: "Please connect with MetaMask to link social accounts. Disconnect social login first.", variant: "destructive" });
      return;
    }

    setLinkingStep("connecting-social");
    setStepError(null);

    try {
      const social = await web3Service.connectWeb3AuthForLinking();
      const socialAddress = social.address;
      const userInfo = social.userInfo;

      setLinkingStep("signing-primary");

      const challengeRes = await apiRequest("POST", "/api/linked-accounts/challenge", {
        primaryAddress: address,
        socialAddress,
      });
      const { nonce, message } = await challengeRes.json();

      const { ethers } = await import("ethers");

      const primaryProvider = new ethers.BrowserProvider(web3Service.getProvider()!);
      const primarySigner = await primaryProvider.getSigner();
      const primarySignature = await primarySigner.signMessage(message);

      setLinkingStep("signing-social");

      const socialBrowserProvider = new ethers.BrowserProvider(social.provider);
      const socialSigner = await socialBrowserProvider.getSigner();
      const socialSignature = await socialSigner.signMessage(message);

      setLinkingStep("verifying");

      await web3Service.disconnectWeb3AuthOnly();

      await apiRequest("POST", "/api/linked-accounts/verify-link", {
        nonce,
        primarySignature,
        socialSignature,
        socialProvider: userInfo?.typeOfLogin || "web3auth",
        socialEmail: userInfo?.email || null,
        socialName: userInfo?.name || null,
      });

      setLinkingStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/linked-accounts/by-primary", address] });
      toast({ title: "Account Linked!", description: "You can now log in with either your wallet or social account." });

      setTimeout(() => setLinkingStep("idle"), 3000);
    } catch (error: any) {
      console.error("Linking error:", error);
      setStepError(error.message || "Failed to link accounts");
      setLinkingStep("error");

      try { await web3Service.disconnectWeb3AuthOnly(); } catch {}
    }
  };

  if (isInitializing) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 mx-auto text-trust-blue mb-4 animate-spin" />
            <CardTitle className="text-2xl">Link Your Accounts</CardTitle>
            <CardDescription>
              Checking wallet connection...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <Link2 className="h-12 w-12 mx-auto text-trust-blue mb-4" />
            <CardTitle className="text-2xl">Link Your Accounts</CardTitle>
            <CardDescription>
              Connect your wallet to manage linked social accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Please connect your wallet first to access this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (providerType === "web3auth") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <Link2 className="h-12 w-12 mx-auto text-trust-blue mb-4" />
            <CardTitle className="text-2xl">Link Your Accounts</CardTitle>
            <CardDescription>
              Access the same .trust domains from any login method
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resolvedLink?.linked ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Your social account is linked!</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-gray-500">Your social wallet</div>
                  <div className="font-mono text-xs break-all">{address}</div>
                  <div className="text-sm text-gray-500 mt-2">Linked to primary wallet</div>
                  <div className="font-mono text-xs break-all text-trust-blue">{resolvedLink.primaryAddress}</div>
                </div>
                <p className="text-sm text-gray-500">
                  Your .trust domains from your primary wallet are accessible with this social login.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Social account not linked yet</span>
                </div>
                <p className="text-sm text-gray-500">
                  To link your social account, please disconnect and reconnect with MetaMask first. 
                  Then you can link your social accounts from this page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-trust-blue" />
            <div>
              <CardTitle className="text-2xl">Link Your Accounts</CardTitle>
              <CardDescription>
                Connect social logins to your wallet so you can access the same .trust domains from any login method
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">How linking works</p>
                <p>Linking connects your social login (Google, Twitter, etc.) to your MetaMask wallet. 
                After linking, logging in with either method will show your .trust domains. 
                You'll need to sign a message with both accounts to prove ownership.</p>
              </div>
            </div>
          </div>

          <div className="border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium">Primary Wallet (MetaMask)</div>
                <div className="text-xs text-gray-500 font-mono">{address}</div>
              </div>
              <Badge variant="outline" className="ml-auto text-green-600 border-green-300">Connected</Badge>
            </div>
          </div>

          {linkedAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Linked Social Accounts</h3>
              {linkedAccounts.map((link) => (
                <div key={link.id} className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {link.socialName || link.socialProvider}
                        <Badge variant="secondary" className="text-xs">{link.socialProvider}</Badge>
                      </div>
                      {link.socialEmail && (
                        <div className="text-xs text-gray-500">{link.socialEmail}</div>
                      )}
                      <div className="text-xs text-gray-400 font-mono truncate">{link.socialAddress}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkMutation.mutate(link.socialAddress)}
                      disabled={unlinkMutation.isPending}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {unlinkMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {linkingStep !== "idle" && linkingStep !== "done" && linkingStep !== "error" && (
            <div className="border dark:border-gray-700 rounded-lg p-6">
              <div className="space-y-4">
                <StepIndicator step="connecting-social" current={linkingStep} label="Connecting social login..." />
                <StepIndicator step="signing-primary" current={linkingStep} label="Sign with MetaMask" />
                <StepIndicator step="signing-social" current={linkingStep} label="Sign with social wallet" />
                <StepIndicator step="verifying" current={linkingStep} label="Verifying signatures..." />
              </div>
            </div>
          )}

          {linkingStep === "done" && (
            <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-800 dark:text-green-200">Successfully Linked!</p>
              <p className="text-sm text-green-600 dark:text-green-400">You can now access your domains with social login.</p>
            </div>
          )}

          {linkingStep === "error" && stepError && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Linking Failed</p>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{stepError}</p>
            </div>
          )}

          <Button
            onClick={startLinking}
            disabled={linkingStep !== "idle" && linkingStep !== "done" && linkingStep !== "error"}
            className="w-full bg-trust-blue hover:bg-trust-blue/90 text-white h-12"
          >
            {linkingStep !== "idle" && linkingStep !== "done" && linkingStep !== "error" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking in progress...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Link a Social Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StepIndicator({ step, current, label }: { step: LinkingStep; current: LinkingStep; label: string }) {
  const steps: LinkingStep[] = ["connecting-social", "signing-primary", "signing-social", "verifying"];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(current);
  const isActive = step === current;
  const isDone = currentIndex > stepIndex;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        isDone ? "bg-green-500 text-white" : isActive ? "bg-trust-blue text-white" : "bg-gray-200 dark:bg-gray-700"
      }`}>
        {isDone ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isActive ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className="text-xs">{stepIndex + 1}</span>
        )}
      </div>
      <span className={`text-sm ${isActive ? "font-medium text-trust-blue" : isDone ? "text-green-600" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}
