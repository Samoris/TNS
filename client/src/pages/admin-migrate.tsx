import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI } from "@/lib/contracts";

const OLD_CONTRACT_ADDRESS = "0xdfe1aB8532925de628C419B65B41f23997c34B4a";
const OLD_CONTRACT_ABI = [
  "function getDomainInfo(string domain) view returns (address domainOwner, uint256 tokenId, uint256 expirationTime, bool exists)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenIdToDomain(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function primaryDomain(address owner) view returns (string)",
  "function owner() view returns (address)",
];

interface DomainData {
  name: string;
  owner: string;
  tokenId: number;
  expirationTime: number;
  expirationDate: string;
  isPrimary: boolean;
  migrated: boolean;
}

export default function AdminMigrate() {
  const { address, isConnected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [contractOwnerAddress, setContractOwnerAddress] = useState("");

  const checkOwnership = async () => {
    if (!isConnected || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, provider);
      const owner = await contract.owner();
      setContractOwnerAddress(owner);
      setIsContractOwner(address?.toLowerCase() === owner.toLowerCase());
    } catch (err: any) {
      console.error("Error checking ownership:", err);
    }
  };

  const fetchDomains = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const oldContract = new ethers.Contract(OLD_CONTRACT_ADDRESS, OLD_CONTRACT_ABI, provider);

      const totalSupply = await oldContract.totalSupply();
      const fetchedDomains: DomainData[] = [];
      const primaryDomains = new Map<string, string>();

      for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
        try {
          const domainName = await oldContract.tokenIdToDomain(tokenId);
          
          if (!domainName) continue;

          const [owner, , expirationTime, exists] = await oldContract.getDomainInfo(domainName);
          
          if (!exists || owner === ethers.ZeroAddress) continue;

          if (!primaryDomains.has(owner)) {
            const primaryDomain = await oldContract.primaryDomain(owner);
            if (primaryDomain) {
              primaryDomains.set(owner, primaryDomain);
            }
          }

          const isPrimary = primaryDomains.get(owner) === domainName;
          const expirationDate = new Date(Number(expirationTime) * 1000).toLocaleDateString();

          fetchedDomains.push({
            name: domainName,
            owner,
            tokenId,
            expirationTime: Number(expirationTime),
            expirationDate,
            isPrimary,
            migrated: false,
          });
        } catch (err) {
          console.error(`Error fetching token ${tokenId}:`, err);
        }
      }

      setDomains(fetchedDomains);
      setSuccess(`Successfully loaded ${fetchedDomains.length} domains from old contract`);
    } catch (err: any) {
      setError(`Failed to fetch domains: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateSingleDomain = async (domain: DomainData, signer: ethers.Signer) => {
    const contract = new ethers.Contract(TNS_REGISTRY_ADDRESS, TNS_REGISTRY_ABI, signer);
    
    const domainWithoutTrust = domain.name.replace('.trust', '');
    const durationInYears = Math.ceil((domain.expirationTime - Math.floor(Date.now() / 1000)) / (365 * 24 * 60 * 60));
    
    let pricePerYear;
    if (domainWithoutTrust.length === 3) {
      pricePerYear = ethers.parseEther("100");
    } else if (domainWithoutTrust.length === 4) {
      pricePerYear = ethers.parseEther("70");
    } else {
      pricePerYear = ethers.parseEther("30");
    }
    
    const totalPrice = pricePerYear * BigInt(Math.max(1, durationInYears));
    
    const secret = ethers.randomBytes(32);
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "address", "bytes32"],
        [domainWithoutTrust, domain.owner, secret]
      )
    );

    const commitTx = await contract.commit(commitment);
    await commitTx.wait();

    await new Promise(resolve => setTimeout(resolve, 61000));

    const registerTx = await contract.register(
      domainWithoutTrust,
      domain.owner,
      secret,
      Math.max(1, durationInYears),
      { value: totalPrice }
    );
    await registerTx.wait();

    if (domain.isPrimary) {
      const setPrimaryTx = await contract.setPrimaryDomain(domainWithoutTrust);
      await setPrimaryTx.wait();
    }
  };

  const migrateDomains = async () => {
    if (!isConnected || !window.ethereum || domains.length === 0) return;

    setIsMigrating(true);
    setError("");
    setSuccess("");
    setMigrationProgress(0);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      let migratedCount = 0;

      for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        
        if (domain.migrated) {
          continue;
        }

        try {
          await migrateSingleDomain(domain, signer);

          setDomains(prev => prev.map((d, idx) => 
            idx === i ? { ...d, migrated: true } : d
          ));

          migratedCount++;
          setMigrationProgress(Math.round(((i + 1) / domains.length) * 100));
        } catch (err: any) {
          console.error(`Failed to migrate ${domain.name}:`, err);
          setError(`Failed to migrate ${domain.name}: ${err.message}`);
          break;
        }
      }

      setSuccess(`Successfully migrated ${migratedCount} domains!`);
    } catch (err: any) {
      setError(`Migration failed: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      oldContract: OLD_CONTRACT_ADDRESS,
      newContract: TNS_REGISTRY_ADDRESS,
      totalDomains: domains.length,
      domains: domains,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useState(() => {
    checkOwnership();
  });

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Migration Panel</CardTitle>
            <CardDescription>Connect your wallet to access admin functions</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to continue
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isContractOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Migration Panel</CardTitle>
            <CardDescription>Access Denied</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are not the contract owner. Only the contract owner can access this page.
                <br />
                <br />
                <strong>Contract Owner:</strong> {contractOwnerAddress}
                <br />
                <strong>Your Address:</strong> {address}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Domain Migration Panel</h1>
        <p className="text-muted-foreground">
          Migrate domains from the old contract to the new contract with metadata support
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Migration Info</CardTitle>
            <CardDescription>Contract addresses and migration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Old Contract</p>
                <p className="font-mono text-sm">{OLD_CONTRACT_ADDRESS}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Contract</p>
                <p className="font-mono text-sm">{TNS_REGISTRY_ADDRESS}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 1: Fetch Domains</CardTitle>
            <CardDescription>Load all domains from the old contract</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={fetchDomains}
              disabled={isLoading}
              data-testid="button-fetch-domains"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Domains...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Fetch Domains from Old Contract
                </>
              )}
            </Button>
            {domains.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Found {domains.length} domains • {domains.filter(d => d.isPrimary).length} with primary domain set
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {domains.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Review & Export</CardTitle>
                <CardDescription>Review the domains and optionally export the data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Button variant="outline" onClick={exportData} data-testid="button-export-data">
                    <Download className="mr-2 h-4 w-4" />
                    Export Migration Data (JSON)
                  </Button>
                </div>

                <div className="rounded-md border max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domains.map((domain, idx) => (
                        <TableRow key={idx} data-testid={`row-domain-${idx}`}>
                          <TableCell className="font-medium">
                            {domain.name}
                            {domain.isPrimary && (
                              <Badge variant="secondary" className="ml-2">Primary</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {domain.owner.slice(0, 8)}...{domain.owner.slice(-6)}
                          </TableCell>
                          <TableCell>{domain.expirationDate}</TableCell>
                          <TableCell>
                            {domain.migrated ? (
                              <Badge variant="default">Migrated</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 3: Execute Migration</CardTitle>
                <CardDescription>
                  Migrate all domains to the new contract. This will take time as each domain requires a 60-second wait period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Each domain requires:
                    <ul className="list-disc list-inside mt-2">
                      <li>Commit transaction (instant)</li>
                      <li>60-second wait period</li>
                      <li>Register transaction with payment</li>
                    </ul>
                    <br />
                    Estimated time: ~{Math.ceil(domains.filter(d => !d.migrated).length * 1.2)} minutes
                  </AlertDescription>
                </Alert>

                {isMigrating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Migration Progress</span>
                      <span>{migrationProgress}%</span>
                    </div>
                    <Progress value={migrationProgress} />
                  </div>
                )}

                <Button
                  onClick={migrateDomains}
                  disabled={isMigrating || domains.every(d => d.migrated)}
                  size="lg"
                  data-testid="button-migrate-domains"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Migrating... ({migrationProgress}%)
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Start Migration ({domains.filter(d => !d.migrated).length} domains)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
