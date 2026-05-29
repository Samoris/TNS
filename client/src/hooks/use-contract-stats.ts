import { useQuery } from "@tanstack/react-query";

export interface ContractStats {
  totalDomains: number;
  totalValueLocked: string;
  activeUsers: number;
}

interface LeaderboardResponse {
  totalHolders: number;
  totalNfts: number;
}

export function useContractStats() {
  return useQuery<ContractStats>({
    queryKey: ["/api/referrals/leaderboard", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/referrals/leaderboard?limit=1");
      if (!res.ok) throw new Error("Failed to load network stats");
      const data: LeaderboardResponse = await res.json();
      return {
        totalDomains: data.totalNfts ?? 0,
        totalValueLocked: "0",
        activeUsers: data.totalHolders ?? 0,
      };
    },
    refetchInterval: 60000,
    staleTime: 45000,
    refetchOnWindowFocus: true,
  });
}
