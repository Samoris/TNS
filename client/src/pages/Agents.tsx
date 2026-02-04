import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Search, Users, MessageSquare, Shield, Star, ExternalLink, Zap, BookOpen, Code } from 'lucide-react';

interface AgentInfo {
  domain: string;
  address: string;
  agentType: string;
  capabilities: string[];
  endpoint?: string;
  mcpEndpoint?: string;
  version?: string;
  registeredAt?: number;
  lastSeen?: number;
  reputation?: {
    score: number;
    tier: string;
    totalStaked?: string;
    stakeholders?: number;
  };
}

interface SchemaInfo {
  agentTypes: string[];
  capabilities: string[];
  reputationTiers: { name: string; minScore: number }[];
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-700 text-white',
  silver: 'bg-gray-400 text-black',
  gold: 'bg-yellow-500 text-black',
  platinum: 'bg-purple-500 text-white',
};

const CAPABILITY_ICONS: Record<string, string> = {
  'text-generation': '✍️',
  'code-review': '🔍',
  'code-generation': '💻',
  'data-analysis': '📊',
  'image-analysis': '🖼️',
  'document-processing': '📄',
  'web-search': '🌐',
  'api-integration': '🔗',
  'task-orchestration': '🎯',
  'smart-contract-analysis': '📜',
  'trading': '📈',
  'risk-assessment': '⚠️',
  'identity-verification': '🔐',
  'reputation-scoring': '⭐',
};

export default function Agents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentInfo[]>([]);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCapability, setFilterCapability] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchQuery, filterCapability, filterType]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schemaRes, directoryRes] = await Promise.all([
        fetch('/api/agents/schema'),
        fetch('/api/agents/directory'),
      ]);

      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        setSchema(schemaData);
      }

      if (directoryRes.ok) {
        const directoryData = await directoryRes.json();
        setAgents(directoryData.agents || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error loading agents', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = [...agents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.domain.toLowerCase().includes(query) ||
          a.agentType.toLowerCase().includes(query) ||
          a.capabilities.some((c) => c.toLowerCase().includes(query))
      );
    }

    if (filterCapability && filterCapability !== 'all') {
      filtered = filtered.filter((a) => a.capabilities.includes(filterCapability));
    }

    if (filterType && filterType !== 'all') {
      filtered = filtered.filter((a) => a.agentType === filterType);
    }

    filtered.sort((a, b) => (b.reputation?.score || 0) - (a.reputation?.score || 0));

    setFilteredAgents(filtered);
  };

  const discoverAgents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCapability && filterCapability !== 'all') params.set('capability', filterCapability);
      if (filterType && filterType !== 'all') params.set('type', filterType);

      const res = await fetch(`/api/agents/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        toast({ title: `Found ${data.agents?.length || 0} agents` });
      }
    } catch (error) {
      toast({ title: 'Discovery failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
          <Bot className="w-10 h-10 text-primary" />
          AI Agent Hub
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover, connect with, and manage AI agents using .trust identities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-sm text-muted-foreground">Registered Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{schema?.capabilities.length || 14}</p>
                <p className="text-sm text-muted-foreground">Capabilities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{agents.filter(a => a.mcpEndpoint).length}</p>
                <p className="text-sm text-muted-foreground">MCP-Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">
                  {agents.filter(a => a.reputation && a.reputation.score >= 50).length}
                </p>
                <p className="text-sm text-muted-foreground">Gold+ Reputation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/agent-register">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Register Agent</h3>
                  <p className="text-sm text-muted-foreground">Claim a .trust identity for your AI agent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agent-test">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Code className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Test APIs</h3>
                  <p className="text-sm text-muted-foreground">Test agent messaging and authentication</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <BookOpen className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Documentation</h3>
                  <p className="text-sm text-muted-foreground">Learn about agent infrastructure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agent Directory
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Discover Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <CardTitle>All Registered Agents</CardTitle>
              <CardDescription>
                Browse all AI agents registered with .trust identities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {schema?.agentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCapability} onValueChange={setFilterCapability}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by capability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Capabilities</SelectItem>
                    {schema?.capabilities.map((cap) => (
                      <SelectItem key={cap} value={cap}>
                        {CAPABILITY_ICONS[cap] || '🔧'} {cap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading agents...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No agents found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Be the first to{' '}
                    <Link href="/agent-register" className="text-primary hover:underline">
                      register an agent
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredAgents.map((agent) => (
                    <Card
                      key={agent.domain}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedAgent(selectedAgent?.domain === agent.domain ? null : agent)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{agent.domain}</h3>
                              {agent.reputation && (
                                <Badge className={TIER_COLORS[agent.reputation.tier] || 'bg-gray-500'}>
                                  {agent.reputation.tier}
                                </Badge>
                              )}
                              {agent.mcpEndpoint && (
                                <Badge variant="outline" className="text-purple-500 border-purple-500">
                                  MCP
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary">
                                {agent.agentType}
                              </Badge>
                              {agent.reputation && (
                                <span className="text-sm text-muted-foreground">
                                  Score: {agent.reputation.score.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {agent.capabilities.slice(0, 5).map((cap) => (
                                <Badge key={cap} variant="outline" className="text-xs">
                                  {CAPABILITY_ICONS[cap] || '🔧'} {cap}
                                </Badge>
                              ))}
                              {agent.capabilities.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{agent.capabilities.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          {agent.endpoint && (
                            <a
                              href={agent.endpoint}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          )}
                        </div>

                        {selectedAgent?.domain === agent.domain && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Address</p>
                                <p className="font-mono text-xs truncate">{agent.address}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Version</p>
                                <p>{agent.version || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Registered</p>
                                <p>{formatDate(agent.registeredAt)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Seen</p>
                                <p>{formatDate(agent.lastSeen)}</p>
                              </div>
                              {agent.endpoint && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">API Endpoint</p>
                                  <p className="font-mono text-xs truncate">{agent.endpoint}</p>
                                </div>
                              )}
                              {agent.mcpEndpoint && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">MCP Endpoint</p>
                                  <p className="font-mono text-xs truncate">{agent.mcpEndpoint}</p>
                                </div>
                              )}
                              {agent.reputation && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">Reputation</p>
                                  <p>
                                    {agent.reputation.totalStaked} TRUST staked by{' '}
                                    {agent.reputation.stakeholders} stakeholders
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/api/agents/${agent.domain.replace('.trust', '')}/manifest`, '_blank');
                                }}
                              >
                                View Manifest
                              </Button>
                              <Link href={`/agent-test?domain=${agent.domain}`}>
                                <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                                  Send Message
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discover">
          <Card>
            <CardHeader>
              <CardTitle>Discover Agents</CardTitle>
              <CardDescription>
                Find agents by capability or type to interact with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Type</SelectItem>
                      <SelectItem value="assistant">Assistant - General purpose AI</SelectItem>
                      <SelectItem value="analyzer">Analyzer - Data analysis</SelectItem>
                      <SelectItem value="trader">Trader - Financial operations</SelectItem>
                      <SelectItem value="validator">Validator - Verification</SelectItem>
                      <SelectItem value="orchestrator">Orchestrator - Multi-agent coordination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Capability</label>
                  <Select value={filterCapability} onValueChange={setFilterCapability}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select capability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Capability</SelectItem>
                      {schema?.capabilities.map((cap) => (
                        <SelectItem key={cap} value={cap}>
                          {CAPABILITY_ICONS[cap] || '🔧'} {cap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={discoverAgents} disabled={isLoading} className="w-full mb-6">
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Discover Agents'}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAgents.map((agent) => (
                  <Card key={agent.domain} className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">{agent.domain}</h3>
                        {agent.reputation && (
                          <Badge className={`${TIER_COLORS[agent.reputation.tier]} text-xs`}>
                            {agent.reputation.score.toFixed(0)}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="mb-2">
                        {agent.agentType}
                      </Badge>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.capabilities.slice(0, 3).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {CAPABILITY_ICONS[cap]} {cap}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        {agent.mcpEndpoint && (
                          <Badge variant="outline" className="text-purple-500">
                            <MessageSquare className="w-3 h-3 mr-1" /> MCP
                          </Badge>
                        )}
                        {agent.endpoint && (
                          <Badge variant="outline" className="text-green-500">
                            <Zap className="w-3 h-3 mr-1" /> API
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            About Agent Identities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Decentralized Identity</h4>
              <p className="text-sm text-muted-foreground">
                Each agent owns a .trust domain on the Intuition blockchain, providing a verifiable,
                self-sovereign identity that can be cryptographically proven.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">MCP Protocol</h4>
              <p className="text-sm text-muted-foreground">
                Agents with MCP endpoints support the Model Context Protocol, enabling standardized
                communication with AI assistants like Claude.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Reputation Staking</h4>
              <p className="text-sm text-muted-foreground">
                Users can stake TRUST tokens on agents they trust, building a decentralized reputation
                system on the Intuition Knowledge Graph.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
