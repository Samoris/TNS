import { useQuery } from "@tanstack/react-query";
import { web3Service } from "@/lib/web3";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI } from "@/lib/contracts";

export interface ContractStats {
  totalDomains: number;
  totalValueLocked: string;
  activeUsers: number;
}

export function useContractStats() {
  return useQuery<ContractStats>({
    queryKey: ["contract-stats", TNS_REGISTRY_ADDRESS],
    queryFn: async () => {
      return await web3Service.getContractStats(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI);
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    staleTime: 3000, // Consider data stale after 3 seconds for more frequent updates
    refetchOnWindowFocus: true,
  });
}