import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  Check,
  Share2,
  Trophy,
  Users,
  Sparkles,
  Wallet,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";

interface MyReferralData {
  code: string;
  walletAddress: string;
  totalPoints: number;
  totalReferrals: number;
  recentReferrals: Array<{
    id: string;
    refereeAddress: string;
    domainName: string;
    pointsAwarded: number;
    createdAt: string;
  }>;
}

interface LeaderboardEntry {
  walletAddress: string;
  code: string;
  totalPoints: number;
  totalReferrals: number;
}

const POINTS_PER_REFERRAL = 100;

function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ReferralsPage() {
  const { isConnected, address, connectWallet } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery<MyReferralData>({
    queryKey: ["/api/referrals/me", address],
    queryFn: async () => {
      const res = await fetch(`/api/referrals/me/${address}`);
      if (!res.ok) throw new Error("Failed to load referral data");
      return res.json();
    },
    enabled: isConnected && !!address,
  });

  const { data: leaderboard, isLoading: lbLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/referrals/leaderboard"],
  });

  const referralLink = me
    ? `https://tns.intuition.box/register?ref=${me.code}`
    : "";

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it to start earning points." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Register your .trust domain",
          text: "Get your own .trust domain on Intuition mainnet",
          url: referralLink,
        });
      } catch {
        // user cancelled — no-op
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="text-center space-y-2 mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-trust-violet/10 text-trust-violet text-sm font-medium">
          <Sparkles className="h-4 w-4" /> Earn points
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Refer friends, earn points</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Share your link. Get <strong>{POINTS_PER_REFERRAL} points</strong> each time someone registers a .trust domain through it.
        </p>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Wallet className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="font-medium">Connect your wallet</p>
              <p className="text-sm text-gray-500">You need a wallet so we can attach a referral code to it.</p>
            </div>
            <Button onClick={connectWallet} className="trust-button" data-testid="connect-wallet-referrals">
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Total Points</div>
                {meLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <div className="text-3xl font-bold text-trust-violet" data-testid="text-total-points">
                    {me?.totalPoints ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Successful Referrals</div>
                {meLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <div className="text-3xl font-bold" data-testid="text-total-referrals">
                    {me?.totalReferrals ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Per Referral</div>
                <div className="text-3xl font-bold text-trust-emerald">+{POINTS_PER_REFERRAL}</div>
              </CardContent>
            </Card>
          </div>

          {/* Referral link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" /> Your referral link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-referral-link"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={copyLink} variant="outline" data-testid="button-copy-link">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-2 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                    </Button>
                    <Button onClick={shareLink} className="trust-button" data-testid="button-share-link">
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                  </div>
                </div>
              )}
              {me && (
                <div className="text-xs text-gray-500">
                  Your code: <span className="font-mono">{me.code}</span>
                </div>
              )}
              <Alert>
                <AlertDescription className="text-sm">
                  When someone visits this link and registers a .trust domain, you automatically receive {POINTS_PER_REFERRAL} points. Self-referrals don't count.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Recent referrals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Recent referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !me?.recentReferrals.length ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No referrals yet. Share your link to get started!
                </p>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {me.recentReferrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3" data-testid={`referral-row-${r.id}`}>
                      <div>
                        <div className="font-medium">{r.domainName}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          by {shortAddr(r.refereeAddress)} · {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className="bg-trust-emerald/10 text-trust-emerald border-trust-emerald/20">
                        +{r.pointsAwarded}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Leaderboard preview (always visible) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Top referrers
            </span>
            <Link href="/leaderboard" className="text-sm font-normal text-trust-blue hover:underline flex items-center gap-1" data-testid="link-full-leaderboard">
              View full leaderboard <ArrowRight className="h-3 w-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lbLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !leaderboard?.length ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No referrals yet — be the first to make the leaderboard!
            </p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboard.map((entry, idx) => {
                const isMe = address && entry.walletAddress.toLowerCase() === address.toLowerCase();
                return (
                  <div
                    key={entry.walletAddress}
                    className={`flex items-center justify-between py-3 ${isMe ? "bg-trust-violet/5 -mx-6 px-6" : ""}`}
                    data-testid={`leaderboard-row-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? "bg-yellow-100 text-yellow-700" :
                        idx === 1 ? "bg-gray-100 text-gray-700" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-mono text-sm">
                          {shortAddr(entry.walletAddress)}
                          {isMe && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">{entry.totalReferrals} referrals</div>
                      </div>
                    </div>
                    <div className="font-bold text-trust-violet">{entry.totalPoints} pts</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
