import { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Shield, Send, MessageSquare } from 'lucide-react';

async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts[0];
}

async function signMessage(message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: unknown;
}

export default function AgentTest() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [domain, setDomain] = useState<string>('testing.trust');
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const [messagePayload, setMessagePayload] = useState<string>('{"greeting": "Hello from agent!"}');
  const [targetDomain, setTargetDomain] = useState<string>('testing.trust');

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      toast({ title: 'Wallet Connected', description: address });
    } catch (error) {
      toast({ title: 'Connection Failed', description: String(error), variant: 'destructive' });
    }
  };

  const runBasicTests = async () => {
    setResults([]);
    setIsRunning(true);

    const tests = [
      { name: 'Schema Endpoint', fn: testSchema },
      { name: 'Discovery Endpoint', fn: testDiscovery },
      { name: 'Directory Endpoint', fn: testDirectory },
      { name: 'MCP Discovery', fn: testMCPDiscovery },
      { name: 'Reputation Endpoint', fn: testReputation },
    ];

    for (const test of tests) {
      addResult({ name: test.name, status: 'running' });
      try {
        const data = await test.fn();
        updateResult(test.name, { status: 'success', message: 'Passed', data });
      } catch (error) {
        updateResult(test.name, { status: 'error', message: String(error) });
      }
    }

    setIsRunning(false);
  };

  const testSchema = async () => {
    const res = await fetch('/api/agents/schema');
    return res.json();
  };

  const testDiscovery = async () => {
    const res = await fetch('/api/agents/discover');
    return res.json();
  };

  const testDirectory = async () => {
    const res = await fetch('/api/agents/directory');
    return res.json();
  };

  const testMCPDiscovery = async () => {
    const res = await fetch('/api/agents/mcp/discover');
    return res.json();
  };

  const testReputation = async () => {
    const cleanDomain = domain.replace(/\.trust$/, '');
    const res = await fetch(`/api/agents/${cleanDomain}/reputation`);
    return res.json();
  };

  const testAuthentication = async () => {
    if (!walletAddress) {
      toast({ title: 'Connect Wallet First', variant: 'destructive' });
      return;
    }

    setResults([]);
    setIsRunning(true);

    addResult({ name: 'Get Challenge', status: 'running' });
    
    try {
      const challengeRes = await fetch('/api/agents/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      const challenge = await challengeRes.json();
      
      if (challenge.error) {
        updateResult('Get Challenge', { status: 'error', message: challenge.error });
        setIsRunning(false);
        return;
      }
      
      updateResult('Get Challenge', { status: 'success', message: 'Challenge received', data: challenge });

      addResult({ name: 'Sign Challenge', status: 'running' });
      
      const signature = await signMessage(challenge.message);
      updateResult('Sign Challenge', { status: 'success', message: 'Signed with MetaMask' });

      addResult({ name: 'Verify Signature', status: 'running' });
      
      const verifyRes = await fetch('/api/agents/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          signature,
          address: walletAddress
        })
      });
      const verify = await verifyRes.json();
      
      if (verify.authenticated) {
        updateResult('Verify Signature', { status: 'success', message: 'Authentication successful!', data: verify });
        toast({ title: 'Authentication Successful', description: `Verified as owner of ${domain}` });
      } else {
        updateResult('Verify Signature', { status: 'error', message: verify.error || 'Verification failed', data: verify });
      }
    } catch (error) {
      toast({ title: 'Authentication Failed', description: String(error), variant: 'destructive' });
    }

    setIsRunning(false);
  };

  const testSendMessage = async () => {
    if (!walletAddress) {
      toast({ title: 'Connect Wallet First', variant: 'destructive' });
      return;
    }

    setResults([]);
    setIsRunning(true);

    try {
      addResult({ name: 'Prepare Message', status: 'running' });
      
      let payload;
      try {
        payload = JSON.parse(messagePayload);
      } catch {
        payload = { text: messagePayload };
      }

      const prepareRes = await fetch('/api/agents/messages/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: domain,
          to: targetDomain,
          type: 'request',
          method: 'test',
          payload
        })
      });
      const prepared = await prepareRes.json();
      
      if (prepared.error) {
        updateResult('Prepare Message', { status: 'error', message: prepared.error });
        setIsRunning(false);
        return;
      }
      
      updateResult('Prepare Message', { status: 'success', message: `Nonce: ${prepared.nonce}`, data: prepared });

      addResult({ name: 'Sign Message', status: 'running' });
      
      const signature = await signMessage(prepared.signablePayload);
      updateResult('Sign Message', { status: 'success', message: 'Signed with MetaMask' });

      addResult({ name: 'Send Message', status: 'running' });
      
      const sendRes = await fetch('/api/agents/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: prepared.from,
          to: prepared.to,
          type: 'request',
          method: 'test',
          payload,
          nonce: prepared.nonce,
          signature
        })
      });
      const send = await sendRes.json();
      
      if (send.success) {
        updateResult('Send Message', { status: 'success', message: `Message ID: ${send.messageId}`, data: send });
        toast({ title: 'Message Sent', description: `ID: ${send.messageId}` });
      } else {
        updateResult('Send Message', { status: 'error', message: send.error, data: send });
      }
    } catch (error) {
      toast({ title: 'Send Failed', description: String(error), variant: 'destructive' });
    }

    setIsRunning(false);
  };

  const testRetrieveMessages = async () => {
    if (!walletAddress) {
      toast({ title: 'Connect Wallet First', variant: 'destructive' });
      return;
    }

    setResults([]);
    setIsRunning(true);

    try {
      addResult({ name: 'Create Auth Signature', status: 'running' });
      
      const timestamp = Date.now().toString();
      const message = `Get messages for ${domain} at ${timestamp}`;
      const signature = await signMessage(message);
      
      updateResult('Create Auth Signature', { status: 'success', message: 'Signed retrieval request' });

      addResult({ name: 'Retrieve Messages', status: 'running' });
      
      const res = await fetch(
        `/api/agents/messages/${encodeURIComponent(domain)}?signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
      );
      const messages = await res.json();
      
      if (messages.error) {
        updateResult('Retrieve Messages', { status: 'error', message: messages.error, data: messages });
      } else {
        updateResult('Retrieve Messages', { 
          status: 'success', 
          message: `Found ${messages.count} messages`, 
          data: messages 
        });
        toast({ title: 'Messages Retrieved', description: `${messages.count} messages found` });
      }
    } catch (error) {
      toast({ title: 'Retrieval Failed', description: String(error), variant: 'destructive' });
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Agent API Tester</h1>
          <p className="text-muted-foreground">Test TNS agent infrastructure using your wallet</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Wallet Connection
            </CardTitle>
            <CardDescription>Connect your wallet to test authenticated endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Your Domain</Label>
                <Input 
                  value={domain} 
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="yourdomain.trust"
                />
              </div>
              <Button onClick={handleConnect} disabled={!!walletAddress}>
                {walletAddress ? `Connected: ${walletAddress.slice(0, 8)}...` : 'Connect Wallet'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Tests</CardTitle>
              <CardDescription>Test public endpoints (no wallet needed)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={runBasicTests} disabled={isRunning} className="w-full">
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Run Basic Tests
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication Test</CardTitle>
              <CardDescription>Test challenge-response auth flow</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={testAuthentication} disabled={isRunning || !walletAddress} className="w-full">
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Test Authentication
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Message Test
            </CardTitle>
            <CardDescription>Test sending a signed message to another agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Target Domain</Label>
                <Input 
                  value={targetDomain} 
                  onChange={(e) => setTargetDomain(e.target.value)}
                  placeholder="receiver.trust"
                />
              </div>
              <div>
                <Label>Message Payload (JSON)</Label>
                <Textarea 
                  value={messagePayload} 
                  onChange={(e) => setMessagePayload(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={2}
                />
              </div>
            </div>
            <Button onClick={testSendMessage} disabled={isRunning || !walletAddress} className="w-full">
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test Message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Retrieve Messages
            </CardTitle>
            <CardDescription>Get messages for your domain (requires signed authentication)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testRetrieveMessages} disabled={isRunning || !walletAddress} className="w-full">
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              Retrieve My Messages
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    {result.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-blue-500 mt-0.5" />}
                    {result.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                    {result.status === 'error' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                    {result.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{result.name}</div>
                      {result.message && (
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                      )}
                      {result.data && (
                        <pre className="mt-2 text-xs bg-background p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data as object, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
