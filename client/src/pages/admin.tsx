import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  UserPlus, 
  Users, 
  Trash2, 
  Search,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AdminPage() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  
  // State for single address addition
  const [singleAddress, setSingleAddress] = useState("");
  const [singleFreeMints, setSingleFreeMints] = useState("1");
  
  // State for batch addition
  const [batchAddresses, setBatchAddresses] = useState("");
  const [batchFreeMints, setBatchFreeMints] = useState("1");
  
  // State for whitelist check
  const [checkAddress, setCheckAddress] = useState("");
  const [whitelistStatus, setWhitelistStatus] = useState<number | null>(null);
  
  // State for removal
  const [removeAddress, setRemoveAddress] = useState("");
  
  // Loading states
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const CONTRACT_OWNER = "0xE9bFe128b7F0F7486c206Aa87a2C2E796fc77BcD";
  const isOwner = address?.toLowerCase() === CONTRACT_OWNER.toLowerCase();

  const handleAddSingle = async () => {
    if (!singleAddress || !singleFreeMints) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsAddingSingle(true);
    try {
      // TODO: Implement Web3 call to addToWhitelist
      // await web3Service.addToWhitelist(singleAddress, parseInt(singleFreeMints));
      
      toast({
        title: "Success",
        description: `Added ${singleAddress} to whitelist with ${singleFreeMints} free mints`,
      });
      
      setSingleAddress("");
      setSingleFreeMints("1");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add address to whitelist",
        variant: "destructive",
      });
    } finally {
      setIsAddingSingle(false);
    }
  };

  const handleAddBatch = async () => {
    if (!batchAddresses || !batchFreeMints) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const addresses = batchAddresses
      .split(/[\n,]/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    if (addresses.length === 0) {
      toast({
        title: "Error",
        description: "No valid addresses provided",
        variant: "destructive",
      });
      return;
    }

    setIsAddingBatch(true);
    try {
      // TODO: Implement Web3 call to addToWhitelistBatch
      // await web3Service.addToWhitelistBatch(addresses, parseInt(batchFreeMints));
      
      toast({
        title: "Success",
        description: `Added ${addresses.length} addresses to whitelist with ${batchFreeMints} free mints each`,
      });
      
      setBatchAddresses("");
      setBatchFreeMints("1");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add addresses to whitelist",
        variant: "destructive",
      });
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleCheckWhitelist = async () => {
    if (!checkAddress) {
      toast({
        title: "Error",
        description: "Please enter an address",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      // TODO: Implement Web3 call to getWhitelistStatus
      // const status = await web3Service.getWhitelistStatus(checkAddress);
      const status = 0; // Placeholder
      
      setWhitelistStatus(status);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check whitelist status",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRemove = async () => {
    if (!removeAddress) {
      toast({
        title: "Error",
        description: "Please enter an address",
        variant: "destructive",
      });
      return;
    }

    setIsRemoving(true);
    try {
      // TODO: Implement Web3 call to removeFromWhitelist
      // await web3Service.removeFromWhitelist(removeAddress);
      
      toast({
        title: "Success",
        description: `Removed ${removeAddress} from whitelist`,
      });
      
      setRemoveAddress("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove address from whitelist",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-trust-dark flex items-center justify-center">
        <Card className="trust-card max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-trust-blue mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please connect your wallet to access the admin panel
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-trust-dark flex items-center justify-center">
        <Card className="trust-card max-w-md border-red-500/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You are not authorized to access this page. Only the contract owner can manage the whitelist.
            </p>
            <Badge variant="secondary" className="font-mono text-xs">
              Connected: {address}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-trust-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-trust-blue" />
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                  Admin Panel
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Manage whitelist for free domain minting
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Contract Owner
            </Badge>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {address}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add Single Address */}
          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-trust-blue" />
                Add Single Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="single-address">Wallet Address</Label>
                <Input
                  id="single-address"
                  type="text"
                  placeholder="0x..."
                  value={singleAddress}
                  onChange={(e) => setSingleAddress(e.target.value)}
                  className="font-mono"
                  data-testid="input-single-address"
                />
              </div>
              <div>
                <Label htmlFor="single-free-mints">Free Mints</Label>
                <Input
                  id="single-free-mints"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="1"
                  value={singleFreeMints}
                  onChange={(e) => setSingleFreeMints(e.target.value)}
                  data-testid="input-single-free-mints"
                />
              </div>
              <Button
                onClick={handleAddSingle}
                disabled={isAddingSingle || !singleAddress || !singleFreeMints}
                className="w-full trust-button"
                data-testid="button-add-single"
              >
                {isAddingSingle ? "Adding..." : "Add to Whitelist"}
              </Button>
            </CardContent>
          </Card>

          {/* Add Batch Addresses */}
          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-trust-blue" />
                Add Multiple Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="batch-addresses">
                  Wallet Addresses (one per line or comma-separated)
                </Label>
                <textarea
                  id="batch-addresses"
                  rows={5}
                  placeholder="0x123...&#10;0x456...&#10;0x789..."
                  value={batchAddresses}
                  onChange={(e) => setBatchAddresses(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  data-testid="input-batch-addresses"
                />
              </div>
              <div>
                <Label htmlFor="batch-free-mints">Free Mints (per address)</Label>
                <Input
                  id="batch-free-mints"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="1"
                  value={batchFreeMints}
                  onChange={(e) => setBatchFreeMints(e.target.value)}
                  data-testid="input-batch-free-mints"
                />
              </div>
              <Button
                onClick={handleAddBatch}
                disabled={isAddingBatch || !batchAddresses || !batchFreeMints}
                className="w-full trust-button"
                data-testid="button-add-batch"
              >
                {isAddingBatch ? "Adding..." : "Add Batch to Whitelist"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Check Whitelist Status */}
          <Card className="trust-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-6 w-6 text-trust-blue" />
                Check Whitelist Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="check-address">Wallet Address</Label>
                <Input
                  id="check-address"
                  type="text"
                  placeholder="0x..."
                  value={checkAddress}
                  onChange={(e) => setCheckAddress(e.target.value)}
                  className="font-mono"
                  data-testid="input-check-address"
                />
              </div>
              <Button
                onClick={handleCheckWhitelist}
                disabled={isChecking || !checkAddress}
                variant="outline"
                className="w-full"
                data-testid="button-check-whitelist"
              >
                {isChecking ? "Checking..." : "Check Status"}
              </Button>
              
              {whitelistStatus !== null && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Free Mints Remaining:</span>
                    <Badge 
                      variant={whitelistStatus > 0 ? "default" : "secondary"}
                      className={whitelistStatus > 0 ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" : ""}
                    >
                      {whitelistStatus}
                    </Badge>
                  </div>
                  {whitelistStatus === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Address is not whitelisted or has used all free mints
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Remove from Whitelist */}
          <Card className="trust-card border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
                Remove from Whitelist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="remove-address">Wallet Address</Label>
                <Input
                  id="remove-address"
                  type="text"
                  placeholder="0x..."
                  value={removeAddress}
                  onChange={(e) => setRemoveAddress(e.target.value)}
                  className="font-mono"
                  data-testid="input-remove-address"
                />
              </div>
              <Button
                onClick={handleRemove}
                disabled={isRemoving || !removeAddress}
                variant="destructive"
                className="w-full"
                data-testid="button-remove-whitelist"
              >
                {isRemoving ? "Removing..." : "Remove from Whitelist"}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ⚠️ This action will remove all remaining free mints for this address
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-8 trust-card bg-trust-blue/5 dark:bg-trust-blue/10 border-trust-blue/20">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-trust-blue" />
              Whitelist Information
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span>
                  Whitelisted addresses can register domains for free without paying TRUST tokens
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span>
                  Each address can have multiple free mints allocated
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span>
                  Free mints are consumed one per registration and cannot be restored
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span>
                  After using all free mints, the address will pay the normal registration fee
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-trust-blue mt-1">•</span>
                <span>
                  Batch operations are more gas-efficient when adding multiple addresses
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
