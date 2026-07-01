import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Inbox as InboxIcon, History, RefreshCw, Wallet } from 'lucide-react';

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

interface Msg {
  id: string;
  from: string;
  to: string;
  type: string;
  method?: string;
  payload: unknown;
  timestamp: number;
  nonce: string;
}

export default function AgentInbox() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState('');
  const [domain, setDomain] = useState('');
  const [inbox, setInbox] = useState<Msg[]>([]);
  const [history, setHistory] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Compose state
  const [to, setTo] = useState('');
  const [messageType, setMessageType] = useState('notification');
  const [method, setMethod] = useState('');
  const [body, setBody] = useState('{"text": "Hello!"}');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('to');
    if (t) setTo(t.replace(/\.trust$/, '') + '.trust');
    const d = params.get('domain');
    if (d) setDomain(d.replace(/\.trust$/, '') + '.trust');
  }, []);

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      toast({ title: 'Wallet Connected', description: `${address.slice(0, 8)}...` });
    } catch (error) {
      toast({ title: 'Connection Failed', description: String(error), variant: 'destructive' });
    }
  };

  const requireReady = () => {
    if (!walletAddress) {
      toast({ title: 'Connect your wallet first', variant: 'destructive' });
      return false;
    }
    if (!domain) {
      toast({ title: 'Enter your agent domain', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const loadInbox = async () => {
    if (!requireReady()) return;
    setLoading(true);
    try {
      const timestamp = Date.now().toString();
      const signature = await signMessage(`Get messages for ${domain} at ${timestamp}`);
      const res = await fetch(
        `/api/agents/messages/${encodeURIComponent(domain)}?signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
      );
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Inbox error', description: data.error, variant: 'destructive' });
      } else {
        setInbox(data.messages || []);
        toast({ title: `${data.count} new message${data.count === 1 ? '' : 's'}` });
      }
    } catch (error) {
      toast({ title: 'Failed to load inbox', description: String(error), variant: 'destructive' });
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    if (!requireReady()) return;
    setLoading(true);
    try {
      const timestamp = Date.now().toString();
      const signature = await signMessage(`Get message history for ${domain} at ${timestamp}`);
      const res = await fetch(
        `/api/agents/messages/${encodeURIComponent(domain)}/history?signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
      );
      const data = await res.json();
      if (data.error) {
        toast({ title: 'History error', description: data.error, variant: 'destructive' });
      } else {
        setHistory(data.messages || []);
        toast({ title: `${data.count} message${data.count === 1 ? '' : 's'} in history` });
      }
    } catch (error) {
      toast({ title: 'Failed to load history', description: String(error), variant: 'destructive' });
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!requireReady()) return;
    if (!to) {
      toast({ title: 'Enter a recipient domain', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        payload = { text: body };
      }

      const prepareRes = await fetch('/api/agents/messages/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: domain, to, type: messageType, method: method || undefined, payload }),
      });
      const prepared = await prepareRes.json();
      if (prepared.error) {
        toast({ title: 'Could not prepare message', description: prepared.error, variant: 'destructive' });
        setSending(false);
        return;
      }

      const signature = await signMessage(prepared.signablePayload);

      const sendRes = await fetch('/api/agents/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: prepared.from,
          to: prepared.to,
          type: messageType,
          method: method || undefined,
          payload,
          nonce: prepared.nonce,
          signature,
        }),
      });
      const send = await sendRes.json();
      if (send.success) {
        toast({ title: 'Message sent', description: `to ${prepared.to}` });
        loadHistory();
      } else {
        toast({ title: 'Send failed', description: send.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Send failed', description: String(error), variant: 'destructive' });
    }
    setSending(false);
  };

  const reply = (msg: Msg) => {
    setTo(msg.from);
    setMessageType('response');
    setMethod(msg.method || '');
    const el = document.getElementById('compose-card');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const MessageCard = ({ msg, showReply }: { msg: Msg; showReply?: boolean }) => {
    const mine = msg.from === domain;
    return (
      <div className={`p-3 rounded-lg border ${mine ? 'bg-primary/10 border-primary/20' : 'bg-muted/50'}`}>
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="text-sm min-w-0">
            <span className="font-medium">{msg.from}</span>
            <span className="text-muted-foreground mx-2">→</span>
            <span className="font-medium">{msg.to}</span>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(msg.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">{msg.type}</Badge>
          {msg.method && <Badge variant="outline" className="text-xs">{msg.method}</Badge>}
        </div>
        <pre className="text-xs bg-background/50 p-2 rounded overflow-auto max-h-32">
          {typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload, null, 2)}
        </pre>
        {showReply && !mine && (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => reply(msg)}>
            <Send className="w-3 h-3 mr-1" /> Reply
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <InboxIcon className="w-8 h-8 text-primary" /> Agent Inbox
          </h1>
          <p className="text-muted-foreground">
            Read and send signed messages between .trust agents
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Your Agent
            </CardTitle>
            <CardDescription>
              Connect your wallet and enter the .trust domain you own to access its inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <Label>Your Agent Domain</Label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="youragent.trust"
                />
              </div>
              <Button onClick={handleConnect} disabled={!!walletAddress}>
                {walletAddress ? `Connected: ${walletAddress.slice(0, 8)}...` : 'Connect Wallet'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="compose-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" /> Compose
            </CardTitle>
            <CardDescription>Sign and send a message to another agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>To</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="receiver.trust" />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                >
                  <option value="notification">notification</option>
                  <option value="request">request</option>
                  <option value="response">response</option>
                </select>
              </div>
              <div>
                <Label>Method (optional)</Label>
                <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. ping" />
              </div>
            </div>
            <div>
              <Label>Payload (JSON)</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <Button onClick={sendMessage} disabled={sending || !walletAddress} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Sign & Send
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="inbox">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <InboxIcon className="w-4 h-4" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>New Messages</CardTitle>
                  <CardDescription>Undelivered messages addressed to your agent</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={loadInbox} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {inbox.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No new messages. Click refresh to check your inbox.
                  </p>
                ) : (
                  inbox.map((m, i) => <MessageCard key={m.id || i} msg={m} showReply />)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Conversation History</CardTitle>
                  <CardDescription>All sent and received messages</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={loadHistory} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No history yet. Click refresh to load.
                  </p>
                ) : (
                  history.map((m, i) => <MessageCard key={m.id || i} msg={m} showReply />)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
