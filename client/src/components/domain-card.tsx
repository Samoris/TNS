import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Globe,
  Calendar,
  Settings,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Flame,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/pricing";
import type { DomainWithRecords } from "@shared/schema";
import { web3Service } from "@/lib/web3";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI } from "@/lib/contracts";

interface DomainCardProps {
  domain: DomainWithRecords;
  walletAddress: string;
}

export function DomainCard({ domain, walletAddress }: DomainCardProps) {
  // Add safety check for domain object
  if (!domain) {
    console.error("DomainCard received undefined domain");
    return null;
  }

  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingSubdomain, setIsAddingSubdomain] = useState(false);
  const [newRecord, setNewRecord] = useState({ recordType: "address", key: "", value: "" });
  const [newSubdomain, setNewSubdomain] = useState({ name: "", owner: walletAddress });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add safety checks for domain properties
  const expirationDate = domain.expirationDate || new Date().toISOString();
  const isExpiringSoon = new Date(expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isExpired = new Date(expirationDate) < new Date();

  const addRecordMutation = useMutation({
    mutationFn: async (record: typeof newRecord) => {
      const response = await apiRequest("POST", `/api/domains/${domain.name}/records`, {
        ...record,
        owner: walletAddress,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains/owner", walletAddress] });
      setIsAddingRecord(false);
      setNewRecord({ recordType: "address", key: "", value: "" });
      toast({
        title: "Record added",
        description: "Domain record has been successfully added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add record",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const addSubdomainMutation = useMutation({
    mutationFn: async (subdomain: typeof newSubdomain) => {
      const txHash = await web3Service.createSubdomain(
        TNS_REGISTRY_ADDRESS,
        TNS_REGISTRY_ABI,
        domain.name,
        subdomain.name,
        subdomain.owner
      );
      return txHash;
    },
    onSuccess: (txHash) => {
      queryClient.invalidateQueries({ queryKey: ["blockchain-domains", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/domains/owner", walletAddress] });
      setIsAddingSubdomain(false);
      setNewSubdomain({ name: "", owner: walletAddress });
      toast({
        title: "Subdomain created successfully!",
        description: `Subdomain ${newSubdomain.name}.${domain.name} created. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create subdomain",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const burnDomainMutation = useMutation({
    mutationFn: async () => {
      const txHash = await web3Service.burnExpiredDomain(
        TNS_REGISTRY_ADDRESS,
        TNS_REGISTRY_ABI,
        domain.name
      );
      return txHash;
    },
    onSuccess: (txHash) => {
      // Invalidate both query keys to ensure all domain lists refresh
      queryClient.invalidateQueries({ queryKey: ["blockchain-domains", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["/api/domains/owner", walletAddress] });
      toast({
        title: "Domain burned successfully!",
        description: `${domain.name} has been burned and is now available for re-registration. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to burn domain",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async () => {
      // Call blockchain transaction to set primary domain
      const txHash = await web3Service.setPrimaryDomain(
        TNS_REGISTRY_ADDRESS,
        TNS_REGISTRY_ABI,
        domain.name
      );
      return txHash;
    },
    onSuccess: (txHash) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains/owner", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["blockchain-domains", walletAddress] });
      toast({
        title: "Primary domain set on blockchain!",
        description: `${domain.name} is now your primary domain. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set primary domain",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: `${field} copied successfully`,
    });
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <Badge variant="destructive" data-testid="status-expired">
          Expired
        </Badge>
      );
    }
    if (isExpiringSoon) {
      return (
        <Badge className="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300" data-testid="status-expiring">
          Expiring Soon
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" data-testid="status-active">
        Active
      </Badge>
    );
  };

  return (
    <Card className="trust-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-trust-blue/10 rounded-lg flex items-center justify-center mr-4">
              <Globe className="text-trust-blue h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg" data-testid={`domain-name-${domain.name || 'unknown'}`}>
                {domain.name || 'Unknown Domain'}
              </CardTitle>
              <p className="text-sm text-gray-500" data-testid={`expiry-date-${domain.name || 'unknown'}`}>
                Expires: {domain.expirationDate ? new Date(domain.expirationDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {domain.isPrimary && (
              <Badge className="bg-trust-violet text-white" data-testid={`primary-badge-${domain.name || 'unknown'}`}>
                Primary
              </Badge>
            )}
            {getStatusBadge()}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`manage-${domain.name || 'unknown'}`}>
                  <Settings className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage {domain.name || 'Domain'}</DialogTitle>
                  <DialogDescription>
                    Configure your domain settings, records, and subdomains
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Domain Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Domain Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>Owner</Label>
                        <div className="flex items-center mt-1">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded flex-1">
                            {domain.owner || 'Unknown Owner'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(domain.owner || "", "Owner address")}
                            className="ml-2"
                          >
                            {copiedField === "Owner address" ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Token ID</Label>
                        <div className="flex items-center mt-1">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded flex-1">
                            {domain.tokenId || 'N/A'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(domain.tokenId || "", "Token ID")}
                            className="ml-2"
                          >
                            {copiedField === "Token ID" ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {!domain.isPrimary && (
                      <div className="mt-4">
                        <Button
                          onClick={() => setPrimaryMutation.mutate()}
                          disabled={setPrimaryMutation.isPending || isExpired}
                          className="trust-button w-full"
                          data-testid="set-primary-button"
                        >
                          {setPrimaryMutation.isPending ? "Setting..." : "Set as Primary Domain"}
                        </Button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          Primary domains represent your main identity on TNS
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Address Records */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Address Records</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingRecord(true)}
                        data-testid="add-record-button"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Record
                      </Button>
                    </div>

                    {isAddingRecord && (
                      <Card className="mb-4 p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor="recordType">Type</Label>
                              <select
                                id="recordType"
                                value={newRecord.recordType}
                                onChange={(e) => setNewRecord({ ...newRecord, recordType: e.target.value })}
                                className="w-full p-2 border rounded"
                              >
                                <option value="address">Address</option>
                                <option value="content">Content</option>
                                <option value="text">Text</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="recordKey">Key</Label>
                              <Input
                                id="recordKey"
                                placeholder="ETH, BTC, url..."
                                value={newRecord.key}
                                onChange={(e) => setNewRecord({ ...newRecord, key: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="recordValue">Value</Label>
                              <Input
                                id="recordValue"
                                placeholder="Address or value"
                                value={newRecord.value}
                                onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => addRecordMutation.mutate(newRecord)}
                              disabled={!newRecord.key || !newRecord.value || addRecordMutation.isPending}
                              size="sm"
                            >
                              {addRecordMutation.isPending ? "Adding..." : "Add Record"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsAddingRecord(false)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    <div className="space-y-2">
                      {(!Array.isArray(domain.records) || domain.records.length === 0) ? (
                        <p className="text-gray-500 text-sm">No records configured</p>
                      ) : (
                        Array.isArray(domain.records) && domain.records.map((record, index) => (
                          <div
                            key={record.id || index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {record.recordType}: {record.key}
                              </div>
                              <div className="text-sm text-gray-500 font-mono">
                                {record.value}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(record.value, `${record.key} record`)}
                              >
                                {copiedField === `${record.key} record` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Subdomains */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Subdomains</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingSubdomain(true)}
                        data-testid="add-subdomain-button"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Subdomain
                      </Button>
                    </div>

                    {isAddingSubdomain && (
                      <Card className="mb-4 p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="subdomainName">Subdomain Name</Label>
                              <div className="flex items-center">
                                <Input
                                  id="subdomainName"
                                  placeholder="blog"
                                  value={newSubdomain.name}
                                  onChange={(e) => setNewSubdomain({ ...newSubdomain, name: e.target.value })}
                                  className="rounded-r-none"
                                />
                                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 rounded-r text-sm">
                                  .{domain.name}
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="subdomainOwner">Owner Address</Label>
                              <Input
                                id="subdomainOwner"
                                placeholder="0x..."
                                value={newSubdomain.owner}
                                onChange={(e) => setNewSubdomain({ ...newSubdomain, owner: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => addSubdomainMutation.mutate(newSubdomain)}
                              disabled={!newSubdomain.name || !newSubdomain.owner || addSubdomainMutation.isPending}
                              size="sm"
                            >
                              {addSubdomainMutation.isPending ? "Creating..." : "Create Subdomain"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsAddingSubdomain(false)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    <div className="space-y-2">
                      {(!Array.isArray(domain.subdomains) || domain.subdomains.length === 0) ? (
                        <p className="text-gray-500 text-sm">No subdomains created</p>
                      ) : (
                        Array.isArray(domain.subdomains) && domain.subdomains.map((subdomain) => (
                          <div
                            key={subdomain.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{subdomain.name}</div>
                              <div className="text-sm text-gray-500">Owner: {subdomain.owner}</div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div>Annual Price: {formatPrice(domain.pricePerYear)}</div>
            <div>{(domain.records || []).length} records, {(domain.subdomains || []).length} subdomains</div>
          </div>
          
          {isExpired ? (
            <Button 
              variant="outline" 
              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
              onClick={() => burnDomainMutation.mutate()}
              disabled={burnDomainMutation.isPending}
              data-testid={`burn-${domain.name}`}
            >
              <Flame className="h-4 w-4 mr-1" />
              {burnDomainMutation.isPending ? "Burning..." : "Burn NFT"}
            </Button>
          ) : isExpiringSoon && (
            <Button variant="outline" className="trust-button" data-testid={`renew-${domain.name}`}>
              <Calendar className="h-4 w-4 mr-1" />
              Renew
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
