import { useState, useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Bot, BadgeCheck, ArrowLeft, ExternalLink, Loader2, RefreshCw, Shield,
  MessageSquare, Star, Activity, Settings, Save,
} from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700 text-white',
  silver: 'bg-gray-400 text-black',
  gold: 'bg-yellow-500 text-black',
  platinum: 'bg-purple-500 text-white',
};

const HEALTH_STYLES: Record<string, { dot: string; label: string }> = {
  online: { dot: 'bg-green-500', label: 'Online' },
  offline: { dot: 'bg-red-500', label: 'Offline' },
  unknown: { dot: 'bg-gray-400', label: 'Unknown' },
};

interface AgentData {
  domain: string;
  address: string;
  agentType?: string;
  capabilities?: string[];
  endpoint?: string;
  mcpEndpoint?: string;
  publicKey?: string;
  version?: string;
  verified?: boolean;
  healthStatus?: 'online' | 'offline' | 'unknown';
  reputation?: { score: number; tier: string; totalStaked?: string; stakeholders?: number };
}

async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts[0];
}

async function signMessage(message: string): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

export default function AgentProfile() {
  const { toast } = useToast();
  const [, params] = useRoute('/agents/:domain');
  const rawDomain = params?.domain || '';
  const domain = rawDomain.replace(/\.trust$/, '');
  const fullDomain = domain ? `${domain}.trust` : '';

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [health, setHealth] = useState<{ status: string; lastCheckedAt?: number } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyInfo, setVerifyInfo] = useState<{ token: string; instructions: string } | null>(null);

  const [walletAddress, setWalletAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editEndpoint, setEditEndpoint] = useState('');
  const [editMcp, setEditMcp] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editCaps, setEditCaps] = useState('');

  useEffect(() => {
    if (domain) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const load = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/agents/${domain}`);
      if (res.status === 404) {
        setNotFound(true);
        setAgent(null);
      } else if (res.ok) {
        const data = await res.json();
        setAgent(data);
        setHealth({ status: data.healthStatus || 'unknown', lastCheckedAt: data.lastHealthCheckAt });
        setEditEndpoint(data.endpoint || '');
        setEditMcp(data.mcpEndpoint || '');
        setEditVersion(data.version || '');
        setEditCaps((data.capabilities || []).join(', '));
      }
    } catch {
      toast({ title: 'Failed to load agent', variant: 'destructive' });
    }
    setLoading(false);
  };

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch(`/api/agents/${domain}/health?force=true`);
      const data = await res.json();
      setHealth({ status: data.status, lastCheckedAt: data.lastCheckedAt });
      toast({ title: `Endpoint is ${data.status}` });
    } catch {
      toast({ title: 'Health check failed', variant: 'destructive' });
    }
    setCheckingHealth(false);
  };

  const startVerification = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/agents/${domain}/verify/challenge`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Cannot start verification', description: data.error, variant: 'destructive' });
      } else {
        setVerifyInfo({ token: data.token, instructions: data.instructions });
        toast({ title: 'Verification token issued', description: 'Serve it at the well-known path, then confirm.' });
      }
    } catch {
      toast({ title: 'Verification failed', variant: 'destructive' });
    }
    setVerifying(false);
  };

  const confirmVerification = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/agents/${domain}/verify/confirm`, { method: 'POST' });
      const data = await res.json();
      if (data.verified) {
        toast({ title: 'Agent verified!' });
        setVerifyInfo(null);
        load();
      } else {
        toast({ title: 'Verification not confirmed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Verification failed', variant: 'destructive' });
    }
    setVerifying(false);
  };

  const handleConnect = async () => {
    try {
      const addr = await connectWallet();
      setWalletAddress(addr);
      toast({ title: 'Wallet connected', description: `${addr.slice(0, 8)}...` });
    } catch (e) {
      toast({ title: 'Connection failed', description: String(e), variant: 'destructive' });
    }
  };

  const saveEdit = async () => {
    if (!walletAddress) {
      toast({ title: 'Connect your wallet first', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const timestamp = Date.now().toString();
      const updates: Record<string, unknown> = {
        endpoint: editEndpoint || null,
        mcpEndpoint: editMcp || null,
        version: editVersion,
        capabilities: editCaps.split(',').map((c) => c.trim()).filter(Boolean),
      };
      const signature = await signMessage(
        `Update agent ${fullDomain} at ${timestamp}: ${JSON.stringify(updates)}`
      );
      const res = await fetch(`/api/agents/${domain}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, timestamp, updates }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Profile updated' });
        setEditing(false);
        load();
      } else {
        toast({ title: 'Update failed', description: data.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Update failed', description: String(e), variant: 'destructive' });
    }
    setSavingEdit(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="container mx-auto py-16 text-center max-w-lg">
        <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="text-2xl font-bold mb-2">Agent not found</h1>
        <p className="text-muted-foreground mb-6">
          {fullDomain || 'This domain'} is not registered as an agent.
        </p>
        <Link href="/agents">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Agent Hub</Button>
        </Link>
      </div>
    );
  }

  const healthStyle = HEALTH_STYLES[health?.status || 'unknown'];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <Link href="/agents">
        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Agent Hub</Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2 flex-wrap">
                <Bot className="w-7 h-7 text-primary" />
                {agent.domain}
                {agent.verified && (
                  <Badge className="bg-blue-500 text-white flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </Badge>
                )}
                {agent.reputation && (
                  <Badge className={TIER_COLORS[agent.reputation.tier] || 'bg-gray-500'}>
                    {agent.reputation.tier}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="font-mono text-xs mt-2 break-all">
                {agent.address}
              </CardDescription>
            </div>
            <Link href={`/agent-inbox?to=${agent.domain}`}>
              <Button size="sm"><MessageSquare className="w-4 h-4 mr-2" /> Message</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Star className="w-4 h-4" /> Reputation
              </div>
              <p className="text-2xl font-bold">{agent.reputation?.score?.toFixed(0) ?? '—'}</p>
              <p className="text-xs text-muted-foreground capitalize">{agent.reputation?.tier} tier</p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Activity className="w-4 h-4" /> Status
              </div>
              <p className="text-lg font-semibold flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${healthStyle.dot}`} />
                {healthStyle.label}
              </p>
              <Button
                variant="link" size="sm" className="px-0 h-auto text-xs"
                onClick={runHealthCheck} disabled={checkingHealth || !agent.endpoint}
              >
                {checkingHealth ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Check now
              </Button>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Shield className="w-4 h-4" /> On-chain Stake
              </div>
              <p className="text-lg font-semibold">{agent.reputation?.totalStaked ?? '0'} TRUST</p>
              <p className="text-xs text-muted-foreground">{agent.reputation?.stakeholders ?? 0} stakeholders</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Type & Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {agent.agentType && <Badge variant="secondary">{agent.agentType}</Badge>}
              {(agent.capabilities || []).map((c) => (
                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version</p>
              <p>{agent.version || 'N/A'}</p>
            </div>
            {agent.endpoint && (
              <div className="min-w-0">
                <p className="text-muted-foreground">API Endpoint</p>
                <a href={agent.endpoint} target="_blank" rel="noopener noreferrer"
                   className="text-primary hover:underline flex items-center gap-1 truncate">
                  <span className="truncate">{agent.endpoint}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}
            {agent.mcpEndpoint && (
              <div className="min-w-0">
                <p className="text-muted-foreground">MCP Endpoint</p>
                <p className="font-mono text-xs truncate">{agent.mcpEndpoint}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap pt-2 border-t">
            <Button variant="outline" size="sm"
              onClick={() => window.open(`/api/agents/${domain}/manifest`, '_blank')}>
              View Manifest
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              <Settings className="w-4 h-4 mr-2" /> {editing ? 'Cancel Edit' : 'Edit Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint verification */}
      {agent.endpoint && !agent.verified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BadgeCheck className="w-5 h-5 text-blue-500" /> Verify Endpoint
            </CardTitle>
            <CardDescription>
              Prove you control this agent's endpoint to earn a Verified badge and a reputation boost.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!verifyInfo ? (
              <Button onClick={startVerification} disabled={verifying}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Start Verification
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{verifyInfo.instructions}</p>
                <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all">
                  {`{"domain":"${agent.domain}","token":"${verifyInfo.token}"}`}
                </div>
                <Button onClick={confirmVerification} disabled={verifying}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  I've Served It — Confirm
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Owner profile editing */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5" /> Edit Profile
            </CardTitle>
            <CardDescription>
              Changes require a wallet signature from the domain owner. Changing the endpoint resets verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!walletAddress && (
              <Button variant="outline" onClick={handleConnect}>Connect Owner Wallet</Button>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>API Endpoint</Label>
                <Input value={editEndpoint} onChange={(e) => setEditEndpoint(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>MCP Endpoint</Label>
                <Input value={editMcp} onChange={(e) => setEditMcp(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Version</Label>
                <Input value={editVersion} onChange={(e) => setEditVersion(e.target.value)} placeholder="1.0.0" />
              </div>
              <div>
                <Label>Capabilities (comma-separated)</Label>
                <Input value={editCaps} onChange={(e) => setEditCaps(e.target.value)} placeholder="text-generation, web-search" />
              </div>
            </div>
            <Button onClick={saveEdit} disabled={savingEdit || !walletAddress}>
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
