import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Crown, Sparkles, Wallet, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  walletAddress: string;
  code: string | null;
  totalPoints: number;
  referralPoints: number;
  holderPoints: number;
  totalReferrals: number;
  nftCount: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  lastUpdated: number;
  totalHolders: number;
}

interface RankInfo {
  rank: number;
  totalParticipants: number;
  totalPoints: number;
}

function timeAgo(ts: number): string {
  if (!ts) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />;
  return null;
}

function rankBadgeStyle(rank: number): string {
  if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md";
  if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md";
  if (rank === 3) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md";
  return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
}

export default function LeaderboardPage() {
  const { address, isConnected } = useWallet();

  const { data: lbData, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/referrals/leaderboard", { limit: "all" }],
    queryFn: async () => {
      const res = await fetch("/api/referrals/leaderboard?limit=10000");
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return res.json();
    },
    refetchInterval: 30_000,
  });
  const leaderboard = lbData?.entries;
  const lastUpdated = lbData?.lastUpdated ?? 0;
  const totalHolders = lbData?.totalHolders ?? 0;

  // Tick once a second so "X seconds ago" updates without re-fetching
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/referrals/leaderboard/refresh");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/rank"] });
    },
  });

  const { data: myRank } = useTanstackQuery<RankInfo | null>({
    queryKey: ["/api/referrals/rank", address],
    queryFn: async () => {
      const res = await fetch(`/api/referrals/rank/${address}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load rank");
      return res.json();
    },
    enabled: isConnected && !!address,
  });

  const myAddress = address?.toLowerCase();
  const inLeaderboard = leaderboard?.some((e) => e.walletAddress.toLowerCase() === myAddress);
  const top3 = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
          <Trophy className="h-4 w-4" /> Leaderboard
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold">Top earners</h1>
        <p className="text-gray-600 dark:text-gray-400">
          1,000 points per .trust domain held + 100 points per successful referral.
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trust-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-trust-emerald"></span>
            </span>
            Live on-chain · {totalHolders} holders · updated {timeAgo(lastUpdated)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh-leaderboard"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Your rank */}
      {isConnected && (
        <Card className="border-trust-violet/20 bg-gradient-to-r from-trust-violet/5 to-trust-blue/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-trust-violet/15 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-trust-violet" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Your standing</div>
                  {myRank ? (
                    <div className="text-xl font-bold" data-testid="text-my-rank">
                      Rank #{myRank.rank} of {myRank.totalParticipants}
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-gray-500">
                      Not ranked yet
                    </div>
                  )}
                </div>
              </div>
              <Link href="/referrals">
                <Button className="trust-button" data-testid="link-get-referral-link">
                  Get your referral link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-gray-400" />
              <div className="text-sm">
                Connect your wallet to see your rank and get your own referral link.
              </div>
            </div>
            <Link href="/referrals">
              <Button variant="outline">Go to referrals</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Podium (top 3) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : top3.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {top3.map((entry, idx) => {
            const rank = idx + 1;
            const isMe = address && entry.walletAddress.toLowerCase() === myAddress;
            return (
              <Card
                key={entry.walletAddress}
                className={`overflow-hidden ${rank === 1 ? "sm:order-2 ring-2 ring-yellow-400/40" : rank === 2 ? "sm:order-1" : "sm:order-3"} ${isMe ? "border-trust-violet" : ""}`}
                data-testid={`podium-${rank}`}
              >
                <div className={`h-1.5 ${rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-gray-400" : "bg-orange-500"}`} />
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="flex justify-center">{rankIcon(rank)}</div>
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${rankBadgeStyle(rank)}`}>
                    {rank}
                  </div>
                  <div>
                    <div className="font-mono text-sm">
                      {shortAddr(entry.walletAddress)}
                      {isMe && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{entry.nftCount} held · {entry.totalReferrals} refs</div>
                  </div>
                  <div className="text-2xl font-bold text-trust-violet">{entry.totalPoints.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">points</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Full ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Full ranking
            </span>
            {leaderboard && (
              <span className="text-sm font-normal text-gray-500">
                Top {leaderboard.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !leaderboard?.length ? (
            <p className="text-sm text-gray-500 text-center py-12">
              No referrals yet — be the first to make the leaderboard!
            </p>
          ) : (
            <>
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Wallet</div>
                <div className="col-span-2 text-right">Held</div>
                <div className="col-span-2 text-right">Referrals</div>
                <div className="col-span-2 text-right">Points</div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {rest.map((entry, idx) => {
                  const rank = idx + 4;
                  const isMe = address && entry.walletAddress.toLowerCase() === myAddress;
                  return (
                    <div
                      key={entry.walletAddress}
                      className={`grid grid-cols-12 gap-4 px-6 py-3 items-center ${isMe ? "bg-trust-violet/5" : ""}`}
                      data-testid={`ranking-row-${rank}`}
                    >
                      <div className="col-span-2 sm:col-span-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rankBadgeStyle(rank)}`}>
                          {rank}
                        </div>
                      </div>
                      <div className="col-span-7 sm:col-span-5">
                        <div className="font-mono text-sm">
                          {shortAddr(entry.walletAddress)}
                          {isMe && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right text-sm text-gray-600 dark:text-gray-400">
                        <span className="sm:hidden text-xs">held: </span>
                        {entry.nftCount}
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right text-sm text-gray-600 dark:text-gray-400">
                        <span className="sm:hidden text-xs">refs: </span>
                        {entry.totalReferrals}
                      </div>
                      <div className="col-span-12 sm:col-span-2 text-right font-bold text-trust-violet">
                        {entry.totalPoints.toLocaleString()} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Safety net: show user row at bottom if somehow not in the visible list */}
          {isConnected && myRank && !inLeaderboard && leaderboard && leaderboard.length > 0 && (
            <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 px-6 py-3 bg-trust-violet/5">
              <div className="text-xs text-gray-500 mb-2">Your position</div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-2 sm:col-span-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rankBadgeStyle(myRank.rank)}`}>
                    {myRank.rank}
                  </div>
                </div>
                <div className="col-span-7 sm:col-span-6 font-mono text-sm">
                  {shortAddr(address!)}
                  <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
