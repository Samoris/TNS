import { useQuery } from "@tanstack/react-query";
import { web3Service } from "@/lib/web3";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI } from "@/lib/contracts";

export interface ContractStats {
  totalDomains: number;
  totalValueLocked: string;
  activeUsers: number;
  nextTokenId?: string;
}

export function useContractStats() {
  return useQuery<ContractStats>({
    queryKey: ["contract-stats", TNS_REGISTRY_ADDRESS],
    queryFn: async () => {
      return await web3Service.getContractStats(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI);
    },
    refetchInterval: 60000, // Refresh every 60 seconds (comprehensive queries are expensive)
    staleTime: 45000, // Consider data stale after 45 seconds
    refetchOnWindowFocus: true,
  });
}