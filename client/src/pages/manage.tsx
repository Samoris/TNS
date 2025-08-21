import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Search,
  Grid,
  List,
  Filter,
  Calendar,
  Globe,
  TrendingUp,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { WalletConnection } from "@/components/wallet-connection";
import { DomainCard } from "@/components/domain-card";
import { useWallet } from "@/hooks/use-wallet";
import { Link } from "wouter";
import { web3Service } from "@/lib/web3";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI } from "@/lib/contracts";
import type { DomainWithRecords } from "@shared/schema";

type ViewMode = "grid" | "list";
type FilterOption = "all" | "active" | "expiring" | "expired";
type SortOption = "name" | "expiry" | "price";

export default function ManagePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [searchQuery, setSearchQuery] = useState("");

  const { isConnected, address, isCorrectNetwork } = useWallet();

  // Fetch user's domains from blockchain contract
  const { 
    data: domains, 
    isLoading: isLoadingDomains, 
    error: domainsError 
  } = useQuery<DomainWithRecords[]>({
    queryKey: ["blockchain-domains", address],
    queryFn: async () => {
      if (!address) return [];
      console.log("Fetching domains from blockchain for:", address);
      return await web3Service.getOwnerDomains(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, address);
    },
    enabled: isConnected && isCorrectNetwork && !!address,
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refresh every 30 seconds to get latest blockchain data
  });

  // Filter and sort domains
  const filteredAndSortedDomains = domains ? domains.filter((domain) => {
    // Search filter
    if (searchQuery && !domain.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    const now = new Date();
    const expiryDate = new Date(domain.expirationDate);
    const isExpired = expiryDate < now;
    const isExpiringSoon = expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    switch (filterOption) {
      case "active":
        return !isExpired && !isExpiringSoon;
      case "expiring":
        return isExpiringSoon && !isExpired;
      case "expired":
        return isExpired;
      default:
        return true;
    }
  }).sort((a, b) => {
    switch (sortOption) {
      case "name":
        return a.name.localeCompare(b.name);
      case "expiry":
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      case "price":
        return parseFloat(a.pricePerYear) - parseFloat(b.pricePerYear);
      default:
        return 0;
    }
  }) : [];

  const getStatusCounts = () => {
    if (!domains) return { total: 0, active: 0, expiring: 0, expired: 0 };

    const now = new Date();
    const counts = { total: domains.length, active: 0, expiring: 0, expired: 0 };

    domains.forEach((domain: DomainWithRecords) => {
      const expiryDate = new Date(domain.expirationDate);
      const isExpired = expiryDate < now;
      const isExpiringSoon = expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (isExpired) {
        counts.expired++;
      } else if (isExpiringSoon) {
        counts.expiring++;
      } else {
        counts.active++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (!isConnected || !isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Manage Your Domains
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Connect your wallet to view and manage your TNS domains
            </p>
          </div>
          <WalletConnection onConnected={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              My Domains
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your TNS domains, records, and subdomains
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex space-x-4">
            <Link href="/search">
              <Button className="trust-button" data-testid="register-new-domain">
                <Plus className="mr-2 h-4 w-4" />
                Register New Domain
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="trust-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-trust-blue mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="total-domains">
                    {statusCounts.total}
                  </div>
                  <div className="text-sm text-gray-500">Total Domains</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="active-domains">
                    {statusCounts.active}
                  </div>
                  <div className="text-sm text-gray-500">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mr-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="expiring-domains">
                    {statusCounts.expiring}
                  </div>
                  <div className="text-sm text-gray-500">Expiring Soon</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trust-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="expired-domains">
                    {statusCounts.expired}
                  </div>
                  <div className="text-sm text-gray-500">Expired</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="trust-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search domains..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="domain-search-filter"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex space-x-4">
                <Select value={filterOption} onValueChange={(value: FilterOption) => setFilterOption(value)}>
                  <SelectTrigger className="w-32" data-testid="status-filter">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({statusCounts.total})</SelectItem>
                    <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
                    <SelectItem value="expiring">Expiring ({statusCounts.expiring})</SelectItem>
                    <SelectItem value="expired">Expired ({statusCounts.expired})</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                  <SelectTrigger className="w-32" data-testid="sort-filter">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="expiry">Expiry Date</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                    data-testid="grid-view"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                    data-testid="list-view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoadingDomains ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your domains...</p>
          </div>
        ) : domainsError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load domains. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : filteredAndSortedDomains.length === 0 ? (
          <Card className="trust-card">
            <CardContent className="p-12 text-center">
              <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              {domains && domains.length === 0 ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No domains registered
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    You haven't registered any .trust domains yet. Get started by registering your first domain!
                  </p>
                  <Link href="/search">
                    <Button className="trust-button" data-testid="register-first-domain">
                      <Plus className="mr-2 h-4 w-4" />
                      Register Your First Domain
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No domains match your filters
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria to see your domains.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid md:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredAndSortedDomains.map((domain: DomainWithRecords) => (
              <DomainCard
                key={domain.id}
                domain={domain}
                walletAddress={address!}
              />
            ))}
          </div>
        )}

        {/* Expiring Domains Alert */}
        {statusCounts.expiring > 0 && (
          <Alert className="mt-8 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {statusCounts.expiring} domain{statusCounts.expiring > 1 ? 's' : ''} expiring soon. 
              Renew them to keep ownership.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
