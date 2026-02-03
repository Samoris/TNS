import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Bot, Wallet, CheckCircle, Loader2, Sparkles } from 'lucide-react';

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

export default function AgentRegister() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [userDomains, setUserDomains] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

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
        setUserDomains(domainNames);
        
        if (domainNames.length === 0) {
          toast({ 
            title: 'No Domains Found', 
            description: 'You need to own a .trust domain to register an agent',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Failed to load domains:', error);
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
        setRegistrationComplete(true);
        toast({ 
          title: 'Agent Registered!', 
          description: `${selectedDomain} is now registered as an agent`
        });
      } else {
        toast({ 
          title: 'Registration Failed', 
          description: data.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
    setIsRegistering(false);
  };

  if (registrationComplete) {
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
            <div className="pt-4 space-y-2">
              <Button onClick={() => window.location.href = '/agent-test'} className="w-full">
                Test Your Agent
              </Button>
              <Button variant="outline" onClick={() => setRegistrationComplete(false)} className="w-full">
                Register Another
              </Button>
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
            Give your AI agent a verifiable .trust identity
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
                Step 4: Register
              </CardTitle>
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
