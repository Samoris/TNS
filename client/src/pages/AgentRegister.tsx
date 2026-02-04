import { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Bot, Wallet, CheckCircle, Loader2, Sparkles, Link2, ExternalLink } from 'lucide-react';
import { web3Service } from '@/lib/web3';
import { TNS_BASE_REGISTRAR_ADDRESS } from '@/lib/contracts';

const AGENT_TYPES = [
  { value: 'assistant', label: 'Assistant', description: 'General-purpose AI assistant' },
  { value: 'analyzer', label: 'Analyzer', description: 'Data analysis and insights' },
  { value: 'trader', label: 'Trader', description: 'Trading and financial operations' },
  { value: 'validator', label: 'Validator', description: 'Verification and validation' },
  { value: 'orchestrator', label: 'Orchestrator', description: 'Multi-agent coordination' },
];

const CAPABILITIES = [
  { value: 'text-generation', label: 'Text Generation' },
  { value: 'code-review', label: 'Code Review' },
  { value: 'code-generation', label: 'Code Generation' },
  { value: 'data-analysis', label: 'Data Analysis' },
  { value: 'image-analysis', label: 'Image Analysis' },
  { value: 'document-processing', label: 'Document Processing' },
  { value: 'web-search', label: 'Web Search' },
  { value: 'api-integration', label: 'API Integration' },
  { value: 'task-orchestration', label: 'Task Orchestration' },
  { value: 'smart-contract-analysis', label: 'Smart Contract Analysis' },
  { value: 'trading', label: 'Trading' },
  { value: 'risk-assessment', label: 'Risk Assessment' },
  { value: 'identity-verification', label: 'Identity Verification' },
  { value: 'reputation-scoring', label: 'Reputation Scoring' },
];

type RegistrationStep = 'configure' | 'signing' | 'complete';

export default function AgentRegister() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [userDomains, setUserDomains] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('configure');
  const [txHash, setTxHash] = useState<string>('');
  const [atomAlreadyExists, setAtomAlreadyExists] = useState(false);

  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [agentType, setAgentType] = useState<string>('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState<string>('');
  const [mcpEndpoint, setMcpEndpoint] = useState<string>('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast({ title: 'MetaMask Required', description: 'Please install MetaMask to continue', variant: 'destructive' });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);
      toast({ title: 'Wallet Connected', description: `${address.slice(0, 8)}...${address.slice(-6)}` });
      
      await loadUserDomains(address);
    } catch (error) {
      toast({ title: 'Connection Failed', description: String(error), variant: 'destructive' });
    }
    setIsConnecting(false);
  };

  const loadUserDomains = async (address: string) => {
    setIsLoadingDomains(true);
    try {
      const res = await fetch(`/api/domains/owner/${address}`);
      if (res.ok) {
        const data = await res.json();
        const domainNames = data.domains?.map((d: { name: string }) => d.name) || [];
        if (domainNames.length > 0) {
          setUserDomains(domainNames);
          setIsLoadingDomains(false);
          return;
        }
      }
      
      console.log('Falling back to blockchain query for domains...');
      const blockchainDomains = await web3Service.getOwnerDomainsENS(TNS_BASE_REGISTRAR_ADDRESS, address);
      const domainNames = blockchainDomains.map(d => d.name);
      setUserDomains(domainNames);
      
      if (domainNames.length === 0) {
        toast({ 
          title: 'No Domains Found', 
          description: 'You need to own a .trust domain to register an agent',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to load domains:', error);
      toast({ 
        title: 'Error Loading Domains', 
        description: 'Failed to fetch your domains from the blockchain',
        variant: 'destructive'
      });
    }
    setIsLoadingDomains(false);
  };

  const toggleCapability = (capability: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capability) 
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    );
  };

  const handleRegister = async () => {
    if (!selectedDomain || !agentType || selectedCapabilities.length === 0) {
      toast({ 
        title: 'Missing Information', 
        description: 'Please select a domain, agent type, and at least one capability',
        variant: 'destructive'
      });
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName: selectedDomain,
          agentType,
          capabilities: selectedCapabilities,
          endpoint: endpoint || undefined,
          mcpEndpoint: mcpEndpoint || undefined,
          owner: walletAddress
        })
      });

      const data = await res.json();

      if (data.success || data.domain) {
        toast({ 
          title: 'Agent Metadata Saved', 
          description: 'Now syncing to Knowledge Graph...'
        });
        
        await syncToKnowledgeGraph();
      } else {
        toast({ 
          title: 'Registration Failed', 
          description: data.error || 'Unknown error',
          variant: 'destructive'
        });
        setIsRegistering(false);
      }
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
      setIsRegistering(false);
    }
  };

  const syncToKnowledgeGraph = async () => {
    try {
      const cleanName = selectedDomain.replace(/\.trust$/, '');
      
      const syncRes = await fetch(`/api/sync/user/${walletAddress}`);
      if (!syncRes.ok) {
        throw new Error('Failed to get sync status');
      }
      
      const syncData = await syncRes.json();
      const domainToSync = syncData.domains?.find((d: { name: string }) => 
        d.name === selectedDomain || d.name === cleanName
      );
      
      if (domainToSync?.synced) {
        setAtomAlreadyExists(true);
        setRegistrationStep('complete');
        toast({ 
          title: 'Agent Registered!', 
          description: 'Domain already synced to Knowledge Graph'
        });
        setIsRegistering(false);
        return;
      }
      
      const prepareRes = await fetch('/api/sync/prepare-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: [cleanName]
        })
      });
      
      if (!prepareRes.ok) {
        throw new Error('Failed to prepare sync transaction');
      }
      
      const prepareData = await prepareRes.json();
      
      if (!prepareData.transaction) {
        setAtomAlreadyExists(true);
        setRegistrationStep('complete');
        toast({ 
          title: 'Agent Registered!', 
          description: 'Agent is now discoverable'
        });
        setIsRegistering(false);
        return;
      }
      
      setRegistrationStep('signing');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: prepareData.transaction.to,
        data: prepareData.transaction.data,
        value: prepareData.transaction.value
      });
      
      toast({ 
        title: 'Transaction Sent', 
        description: 'Waiting for confirmation...'
      });
      
      const receipt = await tx.wait();
      setTxHash(receipt?.hash || tx.hash);
      
      await fetch('/api/sync/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanName,
          txHash: receipt?.hash || tx.hash
        })
      });
      
      setRegistrationStep('complete');
      toast({ 
        title: 'Agent Registered On-Chain!', 
        description: 'Your agent is now in the Knowledge Graph'
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        toast({ 
          title: 'Transaction Cancelled', 
          description: 'You cancelled the transaction',
          variant: 'destructive'
        });
        setRegistrationStep('configure');
      } else {
        toast({ 
          title: 'Sync Failed', 
          description: error.message || 'Failed to sync to Knowledge Graph',
          variant: 'destructive'
        });
      }
    }
    setIsRegistering(false);
  };

  if (registrationStep === 'complete') {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Agent Registered!</h2>
            <p className="text-muted-foreground">
              <span className="font-mono font-semibold">{selectedDomain}</span> is now discoverable as a {agentType} agent.
            </p>
            {txHash && (
              <a 
                href={`https://explorer.intuition.systems/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View Transaction
              </a>
            )}
            {atomAlreadyExists && !txHash && (
              <p className="text-sm text-muted-foreground">
                <Link2 className="w-4 h-4 inline mr-1" />
                Already synced to Knowledge Graph
              </p>
            )}
            <div className="pt-4 space-y-2">
              <Button onClick={() => window.location.href = '/agent-test'} className="w-full">
                Test Your Agent
              </Button>
              <Button variant="outline" onClick={() => {
                setRegistrationStep('configure');
                setTxHash('');
                setAtomAlreadyExists(false);
                setSelectedDomain('');
                setAgentType('');
                setSelectedCapabilities([]);
              }} className="w-full">
                Register Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationStep === 'signing') {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-bold">Confirm Transaction</h2>
            <p className="text-muted-foreground">
              Please confirm the transaction in your wallet to register your agent on the Knowledge Graph.
            </p>
            <div className="p-4 bg-muted rounded-lg text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Domain:</span>
                <span className="font-mono">{selectedDomain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Action:</span>
                <span>Create Atom</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Register Your Agent</h1>
          </div>
          <p className="text-muted-foreground">
            Give your AI agent a verifiable .trust identity on the Knowledge Graph
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Step 1: Connect Wallet
            </CardTitle>
            <CardDescription>Connect the wallet that owns your .trust domain</CardDescription>
          </CardHeader>
          <CardContent>
            {walletAddress ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-mono text-sm">{walletAddress}</span>
              </div>
            ) : (
              <Button onClick={connectWallet} disabled={isConnecting} className="w-full">
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
                Connect MetaMask
              </Button>
            )}
          </CardContent>
        </Card>

        {walletAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Select Domain</CardTitle>
              <CardDescription>Choose which .trust domain will be your agent's identity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDomains ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : userDomains.length > 0 ? (
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDomains.map(domain => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center p-4 space-y-2">
                  <p className="text-muted-foreground">No domains found for this wallet</p>
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Register a Domain
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedDomain && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Configure Agent</CardTitle>
              <CardDescription>Define your agent's type and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Agent Type</Label>
                <Select value={agentType} onValueChange={setAgentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Capabilities</Label>
                <p className="text-sm text-muted-foreground">Select what your agent can do</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CAPABILITIES.map(cap => (
                    <div 
                      key={cap.value} 
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCapabilities.includes(cap.value) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleCapability(cap.value)}
                    >
                      <Checkbox 
                        checked={selectedCapabilities.includes(cap.value)}
                        onCheckedChange={() => toggleCapability(cap.value)}
                      />
                      <span className="text-sm">{cap.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm font-medium">Optional: API Endpoints</p>
                <div className="space-y-2">
                  <Label>Agent API Endpoint</Label>
                  <Input 
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://your-agent.com/api"
                  />
                </div>
                <div className="space-y-2">
                  <Label>MCP Endpoint</Label>
                  <Input 
                    value={mcpEndpoint}
                    onChange={(e) => setMcpEndpoint(e.target.value)}
                    placeholder="https://your-agent.com/mcp"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedDomain && agentType && selectedCapabilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Step 4: Register On-Chain
              </CardTitle>
              <CardDescription>
                This will save your agent metadata and create an atom in Intuition's Knowledge Graph
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domain:</span>
                  <span className="font-mono font-medium">{selectedDomain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{agentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capabilities:</span>
                  <span>{selectedCapabilities.length} selected</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> You'll need to sign a transaction to register your agent on the Knowledge Graph. This requires a small amount of ETH for gas.
              </div>

              <Button onClick={handleRegister} disabled={isRegistering} className="w-full" size="lg">
                {isRegistering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bot className="w-4 h-4 mr-2" />
                )}
                Register Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
