import { useState, useEffect } from "react";
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
  ImageIcon,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, calculateDomainPrice } from "@/lib/pricing";
import type { DomainWithRecords } from "@shared/schema";
import { web3Service } from "@/lib/web3";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, TNS_RESOLVER_ADDRESS, TNS_RESOLVER_ABI } from "@/lib/contracts";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

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
  const [newRecord, setNewRecord] = useState({ recordType: "address", key: "", value: "" });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Resolver states
  const [isAddingResolverAddress, setIsAddingResolverAddress] = useState(false);
  const [isAddingTextRecord, setIsAddingTextRecord] = useState(false);
  const [isAddingContentHash, setIsAddingContentHash] = useState(false);
  const [newResolverAddress, setNewResolverAddress] = useState("");
  const [newTextRecord, setNewTextRecord] = useState({ key: "email", value: "" });
  const [newContentHash, setNewContentHash] = useState("");
  const [resolverData, setResolverData] = useState<{
    ethAddress: string;
    contentHash: string;
    textKeys: string[];
    textValues: string[];
  } | null>(null);
  const [loadingResolver, setLoadingResolver] = useState(false);
  
  // Extend domain states
  const [isExtending, setIsExtending] = useState(false);
  const [extendDuration, setExtendDuration] = useState(1);

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

  const extendDomainMutation = useMutation({
    mutationFn: async (years: number) => {
      const txHash = await web3Service.renewDomain(
        TNS_REGISTRY_ADDRESS,
        TNS_REGISTRY_ABI,
        domain.name,
        years
      );
      return txHash;
    },
    onSuccess: (txHash) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains/owner", walletAddress] });
      queryClient.invalidateQueries({ queryKey: ["blockchain-domains", walletAddress] });
      setIsExtending(false);
      setExtendDuration(1);
      toast({
        title: "Domain extended successfully!",
        description: `${domain.name} has been extended for ${extendDuration} year(s). Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to extend domain",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Resolver mutations
  const setResolverAddressMutation = useMutation({
    mutationFn: async (address: string) => {
      const txHash = await web3Service.setAddr(
        TNS_RESOLVER_ADDRESS,
        TNS_RESOLVER_ABI,
        domain.name,
        address
      );
      return txHash;
    },
    onSuccess: async (txHash) => {
      setIsAddingResolverAddress(false);
      setNewResolverAddress("");
      await loadResolverData();
      toast({
        title: "Address set successfully!",
        description: `Domain now resolves to the specified address. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set address",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const setTextRecordMutation = useMutation({
    mutationFn: async (record: { key: string; value: string }) => {
      const txHash = await web3Service.setText(
        TNS_RESOLVER_ADDRESS,
        TNS_RESOLVER_ABI,
        domain.name,
        record.key,
        record.value
      );
      return txHash;
    },
    onSuccess: async (txHash) => {
      setIsAddingTextRecord(false);
      setNewTextRecord({ key: "email", value: "" });
      await loadResolverData();
      toast({
        title: "Text record set successfully!",
        description: `Text record has been updated. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set text record",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const setContentHashMutation = useMutation({
    mutationFn: async (contenthash: string) => {
      const txHash = await web3Service.setContenthash(
        TNS_RESOLVER_ADDRESS,
        TNS_RESOLVER_ABI,
        domain.name,
        contenthash
      );
      return txHash;
    },
    onSuccess: async (txHash) => {
      setIsAddingContentHash(false);
      setNewContentHash("");
      await loadResolverData();
      toast({
        title: "Content hash set successfully!",
        description: `IPFS content hash has been updated. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set content hash",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const setAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const txHash = await web3Service.setText(
        TNS_RESOLVER_ADDRESS,
        TNS_RESOLVER_ABI,
        domain.name,
        "avatar",
        avatarUrl
      );
      return txHash;
    },
    onSuccess: async (txHash) => {
      setIsAddingAvatar(false);
      setNewAvatarUrl("");
      await loadResolverData();
      toast({
        title: "Avatar set successfully!",
        description: `Domain avatar has been updated. Transaction: ${txHash.substring(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set avatar",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Get current avatar from resolver data
  const getCurrentAvatar = (): string | null => {
    if (!resolverData || !resolverData.textKeys) return null;
    const avatarIndex = resolverData.textKeys.indexOf("avatar");
    if (avatarIndex === -1) return null;
    const avatarValue = resolverData.textValues[avatarIndex];
    return avatarValue && avatarValue.trim() !== "" ? avatarValue : null;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Load resolver data
  const loadResolverData = async () => {
    try {
      setLoadingResolver(true);
      const data = await web3Service.getResolverData(
        TNS_RESOLVER_ADDRESS,
        TNS_RESOLVER_ABI,
        domain.name
      );
      setResolverData(data);
    } catch (error) {
      console.error("Failed to load resolver data:", error);
      toast({
        title: "Failed to load resolver data",
        description: error instanceof Error ? error.message : "Could not fetch resolver information",
        variant: "destructive",
      });
      setResolverData(null);
    } finally {
      setLoadingResolver(false);
    }
  };

  // Validation functions
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isValidContentHash = (hash: string): boolean => {
    return hash.length > 0 && (hash.startsWith('0x') || hash.startsWith('Qm') || hash.startsWith('bafy'));
  };

  // Load resolver data when component mounts and when dialog opens
  useEffect(() => {
    loadResolverData();
  }, []);

  useEffect(() => {
    if (isManageOpen) {
      loadResolverData();
    }
  }, [isManageOpen]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: `${field} copied successfully`,
    });
  };

  const calculateExtensionCost = (years: number): number => {
    const { totalCost } = calculateDomainPrice(domain.name);
    return parseFloat(totalCost(years));
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

  const getRecordCount = () => {
    if (!resolverData) return 0;
    
    let count = 0;
    
    // Count ETH address if set
    if (resolverData.ethAddress && resolverData.ethAddress !== "0x0000000000000000000000000000000000000000") {
      count++;
    }
    
    // Count content hash if set
    if (resolverData.contentHash && resolverData.contentHash !== "" && resolverData.contentHash !== "0x") {
      count++;
    }
    
    // Count text records
    if (resolverData.textKeys && resolverData.textKeys.length > 0) {
      // Only count non-empty text values
      const nonEmptyTextRecords = resolverData.textValues.filter(v => v && v !== "").length;
      count += nonEmptyTextRecords;
    }
    
    return count;
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
                    Configure your domain settings and records
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
                          onClick={() => {
                            try {
                              setPrimaryMutation.mutate();
                            } catch (error) {
                              // Error handled by mutation's onError
                            }
                          }}
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

                  {/* Extend Domain */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Extend Domain</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Extend your domain registration before it expires
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs">Current Expiration</Label>
                          <p className="text-sm font-medium mt-1">
                            {new Date(expirationDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <div className="mt-1">
                            {getStatusBadge()}
                          </div>
                        </div>
                      </div>

                      {!isExtending ? (
                        <Button
                          onClick={() => setIsExtending(true)}
                          variant="outline"
                          className="w-full"
                          data-testid="extend-domain-button"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Extend Domain
                        </Button>
                      ) : (
                        <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="extendDuration">Extension Duration</Label>
                              <select
                                id="extendDuration"
                                value={extendDuration}
                                onChange={(e) => setExtendDuration(Number(e.target.value))}
                                className="w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-900"
                                data-testid="extend-duration-select"
                              >
                                <option value={1}>1 Year</option>
                                <option value={2}>2 Years</option>
                                <option value={3}>3 Years</option>
                                <option value={5}>5 Years</option>
                              </select>
                            </div>

                            <div className="bg-trust-blue/10 p-3 rounded-md">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Extension Cost</span>
                                <span className="font-bold text-trust-blue" data-testid="extension-cost">
                                  {calculateExtensionCost(extendDuration)} TRUST
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs mt-2 text-gray-500">
                                <span>Price per year</span>
                                <span>{calculateExtensionCost(1)} TRUST/year</span>
                              </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                              <p className="text-xs text-blue-800 dark:text-blue-300">
                                New expiration date: {new Date(new Date(expirationDate).getTime() + extendDuration * 365.25 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                onClick={() => {
                                  try {
                                    extendDomainMutation.mutate(extendDuration);
                                  } catch (error) {
                                    // Error handled by mutation's onError
                                  }
                                }}
                                disabled={extendDomainMutation.isPending}
                                className="trust-button flex-1"
                                data-testid="confirm-extend-button"
                              >
                                {extendDomainMutation.isPending ? "Extending..." : `Extend for ${extendDuration} Year${extendDuration > 1 ? 's' : ''}`}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsExtending(false);
                                  setExtendDuration(1);
                                }}
                                disabled={extendDomainMutation.isPending}
                                data-testid="cancel-extend-button"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Resolver Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Resolver Settings</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Configure how your domain resolves to addresses, content, and metadata
                    </p>

                    {loadingResolver ? (
                      <p className="text-gray-500 text-sm">Loading resolver data...</p>
                    ) : (
                      <div className="space-y-4">
                        {/* ETH Address Resolution */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">ETH Address</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddingResolverAddress(true)}
                              data-testid="set-resolver-address-button"
                            >
                              {resolverData?.ethAddress && resolverData.ethAddress !== "0x0000000000000000000000000000000000000000" ? (
                                <><Edit3 className="h-3 w-3 mr-1" /> Update</>
                              ) : (
                                <><Plus className="h-3 w-3 mr-1" /> Set Address</>
                              )}
                            </Button>
                          </div>

                          {resolverData?.ethAddress && resolverData.ethAddress !== "0x0000000000000000000000000000000000000000" ? (
                            <div className="flex items-center">
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded flex-1 font-mono">
                                {resolverData.ethAddress}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(resolverData.ethAddress, "Resolver address")}
                                className="ml-2"
                              >
                                {copiedField === "Resolver address" ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No address set</p>
                          )}

                          {isAddingResolverAddress && (
                            <Card className="mt-2 p-3 bg-gray-50 dark:bg-gray-800">
                              <div className="space-y-2">
                                <Input
                                  placeholder="0x..."
                                  value={newResolverAddress}
                                  onChange={(e) => setNewResolverAddress(e.target.value)}
                                  data-testid="resolver-address-input"
                                  className={newResolverAddress && !isValidAddress(newResolverAddress) ? "border-red-500" : ""}
                                />
                                {newResolverAddress && !isValidAddress(newResolverAddress) && (
                                  <p className="text-xs text-red-500">Invalid Ethereum address format</p>
                                )}
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => setResolverAddressMutation.mutate(newResolverAddress)}
                                    disabled={!newResolverAddress || !isValidAddress(newResolverAddress) || setResolverAddressMutation.isPending}
                                    size="sm"
                                    data-testid="confirm-resolver-address-button"
                                  >
                                    {setResolverAddressMutation.isPending ? "Setting..." : "Set Address"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setIsAddingResolverAddress(false);
                                      setNewResolverAddress("");
                                    }}
                                    size="sm"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )}
                        </div>

                        {/* Avatar/Image */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Domain Image</Label>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              allowedFileTypes={['image/*']}
                              onGetUploadParameters={async () => {
                                const response = await fetch('/api/objects/upload', { method: 'POST' });
                                const data = await response.json();
                                return {
                                  method: 'PUT' as const,
                                  url: data.uploadURL,
                                };
                              }}
                              onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                                if (result.successful && result.successful.length > 0) {
                                  const uploadURL = result.successful[0].uploadURL;
                                  if (uploadURL) {
                                    const url = new URL(uploadURL);
                                    const objectPath = `/objects${url.pathname.split('/.private')[1] || url.pathname}`;
                                    setAvatarMutation.mutate(objectPath);
                                  }
                                }
                              }}
                              buttonVariant="outline"
                              buttonSize="sm"
                            >
                              {getCurrentAvatar() ? (
                                <><Edit3 className="h-3 w-3 mr-1" /> Update</>
                              ) : (
                                <><Upload className="h-3 w-3 mr-1" /> Upload Image</>
                              )}
                            </ObjectUploader>
                          </div>

                          {getCurrentAvatar() ? (
                            <div className="flex items-start gap-3">
                              <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                <img 
                                  src={getCurrentAvatar()!} 
                                  alt={`${domain.name} avatar`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block font-mono break-all">
                                  {getCurrentAvatar()}
                                </code>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(getCurrentAvatar()!, "Avatar URL")}
                              >
                                {copiedField === "Avatar URL" ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="text-center">
                                <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">No image set</p>
                                <p className="text-xs text-gray-400 mt-1">Click "Upload Image" to add</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Text Records */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Text Records</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddingTextRecord(true)}
                              data-testid="add-text-record-button"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Record
                            </Button>
                          </div>

                          {isAddingTextRecord && (
                            <Card className="mb-2 p-3 bg-gray-50 dark:bg-gray-800">
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label htmlFor="textRecordKey" className="text-xs">Key</Label>
                                    <select
                                      id="textRecordKey"
                                      value={newTextRecord.key}
                                      onChange={(e) => setNewTextRecord({ ...newTextRecord, key: e.target.value })}
                                      className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                                      data-testid="text-record-key-select"
                                    >
                                      <option value="email">Email</option>
                                      <option value="url">URL</option>
                                      <option value="avatar">Avatar</option>
                                      <option value="description">Description</option>
                                      <option value="com.twitter">Twitter</option>
                                      <option value="com.github">GitHub</option>
                                      <option value="com.discord">Discord</option>
                                      <option value="org.telegram">Telegram</option>
                                    </select>
                                  </div>
                                  <div>
                                    <Label htmlFor="textRecordValue" className="text-xs">Value</Label>
                                    <Input
                                      id="textRecordValue"
                                      placeholder="Enter value..."
                                      value={newTextRecord.value}
                                      onChange={(e) => setNewTextRecord({ ...newTextRecord, value: e.target.value })}
                                      className={`text-sm ${newTextRecord.value && newTextRecord.value.trim() === "" ? "border-red-500" : ""}`}
                                      data-testid="text-record-value-input"
                                    />
                                    {newTextRecord.value && newTextRecord.value.trim() === "" && (
                                      <p className="text-xs text-red-500 mt-1">Value cannot be empty or whitespace only</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => setTextRecordMutation.mutate(newTextRecord)}
                                    disabled={!newTextRecord.value || newTextRecord.value.trim() === "" || setTextRecordMutation.isPending}
                                    size="sm"
                                    data-testid="confirm-text-record-button"
                                  >
                                    {setTextRecordMutation.isPending ? "Adding..." : "Add Record"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setIsAddingTextRecord(false);
                                      setNewTextRecord({ key: "email", value: "" });
                                    }}
                                    size="sm"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )}

                          {resolverData && resolverData.textKeys.length > 0 ? (
                            <div className="space-y-1">
                              {resolverData.textKeys.map((key, index) => (
                                resolverData.textValues[index] && (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                                  >
                                    <div className="flex-1">
                                      <span className="font-medium">{key}:</span>{" "}
                                      <span className="text-gray-600 dark:text-gray-400">{resolverData.textValues[index]}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(resolverData.textValues[index], key)}
                                      className="h-6"
                                    >
                                      {copiedField === key ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                )
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No text records set</p>
                          )}
                        </div>

                        {/* Content Hash (IPFS) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Content Hash (IPFS)</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddingContentHash(true)}
                              data-testid="set-content-hash-button"
                            >
                              {resolverData?.contentHash && resolverData.contentHash !== "0x" ? (
                                <><Edit3 className="h-3 w-3 mr-1" /> Update</>
                              ) : (
                                <><Plus className="h-3 w-3 mr-1" /> Set Hash</>
                              )}
                            </Button>
                          </div>

                          {resolverData?.contentHash && resolverData.contentHash !== "0x" ? (
                            <div className="flex items-center">
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded flex-1 font-mono break-all">
                                {resolverData.contentHash}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(resolverData.contentHash, "Content hash")}
                                className="ml-2"
                              >
                                {copiedField === "Content hash" ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No content hash set</p>
                          )}

                          {isAddingContentHash && (
                            <Card className="mt-2 p-3 bg-gray-50 dark:bg-gray-800">
                              <div className="space-y-2">
                                <Input
                                  placeholder="0x... or IPFS hash (Qm... or bafy...)"
                                  value={newContentHash}
                                  onChange={(e) => setNewContentHash(e.target.value)}
                                  data-testid="content-hash-input"
                                  className={newContentHash && !isValidContentHash(newContentHash) ? "border-red-500" : ""}
                                />
                                {newContentHash && !isValidContentHash(newContentHash) && (
                                  <p className="text-xs text-red-500">Invalid content hash format (must start with 0x, Qm, or bafy)</p>
                                )}
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => setContentHashMutation.mutate(newContentHash)}
                                    disabled={!newContentHash || !isValidContentHash(newContentHash) || setContentHashMutation.isPending}
                                    size="sm"
                                    data-testid="confirm-content-hash-button"
                                  >
                                    {setContentHashMutation.isPending ? "Setting..." : "Set Hash"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setIsAddingContentHash(false);
                                      setNewContentHash("");
                                    }}
                                    size="sm"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )}
                        </div>
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
                                className="w-full p-2 border rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
            <div>
              {loadingResolver ? '...' : getRecordCount()} {loadingResolver ? '' : (getRecordCount() === 1 ? 'record' : 'records')}
            </div>
          </div>
          
          {isExpired ? (
            <Button 
              variant="outline" 
              className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
              onClick={() => {
                try {
                  burnDomainMutation.mutate();
                } catch (error) {
                  // Error handled by mutation's onError
                }
              }}
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
