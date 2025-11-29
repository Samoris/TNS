import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const TNS_API_URL = process.env.TNS_API_URL || 'http://localhost:5000';

async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${TNS_API_URL}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

const server = new Server(
  {
    name: 'tns-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'tns://domains',
        name: 'TNS Domains',
        description: 'Query .trust domain information and knowledge graph data',
        mimeType: 'application/json',
      },
      {
        uri: 'tns://agents',
        name: 'TNS AI Agents',
        description: 'Discover and interact with AI agents registered with .trust identities',
        mimeType: 'application/json',
      },
      {
        uri: 'tns://network',
        name: 'TNS Network Info',
        description: 'Get Intuition mainnet network configuration',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'tns://network') {
    const networkInfo = await fetchFromAPI('/api/network');
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(networkInfo, null, 2),
        },
      ],
    };
  }

  if (uri === 'tns://agents') {
    const directory = await fetchFromAPI('/api/agents/directory');
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(directory, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'resolve_domain',
        description: 'Resolve a .trust domain to get its owner address, metadata, and knowledge graph information',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name (e.g., alice.trust or alice)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'check_availability',
        description: 'Check if a .trust domain is available for registration',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to check (e.g., mydomain)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_reputation',
        description: 'Get the reputation score and staking information for a .trust domain from the Intuition Knowledge Graph',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name (e.g., alice.trust)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_graph',
        description: 'Get knowledge graph relationships for a .trust domain including atoms and triples',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name (e.g., alice.trust)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'discover_agents',
        description: 'Find AI agents registered with .trust identities, optionally filtered by capability or type',
        inputSchema: {
          type: 'object',
          properties: {
            capability: {
              type: 'string',
              description: 'Filter by capability (e.g., text-generation, code-review, data-analysis)',
            },
            type: {
              type: 'string',
              description: 'Filter by agent type (e.g., assistant, analyzer, trader)',
            },
          },
        },
      },
      {
        name: 'get_agent_info',
        description: 'Get detailed information about a specific AI agent registered with a .trust domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Agent domain name (e.g., myagent.trust)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_pricing',
        description: 'Get the current pricing tiers for .trust domain registration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_atoms',
        description: 'Search for atoms in the Intuition Knowledge Graph by URI pattern',
        inputSchema: {
          type: 'object',
          properties: {
            uri: {
              type: 'string',
              description: 'URI pattern to search for (e.g., tns:domain:)',
            },
          },
          required: ['uri'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'resolve_domain': {
        const domain = (args?.domain as string).replace(/\.trust$/, '');
        const atomData = await fetchFromAPI(`/api/atom/${domain}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(atomData, null, 2),
            },
          ],
        };
      }

      case 'check_availability': {
        const domain = (args?.domain as string).replace(/\.trust$/, '');
        const searchResult = await fetchFromAPI(`/api/domains/search/${domain}`);
        return {
          content: [
            {
              type: 'text',
              text: searchResult.available
                ? `${domain}.trust is available for registration! Price: ${searchResult.pricing.pricePerYear} TRUST/year (${searchResult.pricing.tier})`
                : `${domain}.trust is not available. Suggestions: ${searchResult.suggestions?.join(', ') || 'none'}`,
            },
          ],
        };
      }

      case 'get_domain_reputation': {
        const domain = (args?.domain as string).replace(/\.trust$/, '');
        const reputation = await fetchFromAPI(`/api/domains/${domain}/reputation`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reputation, null, 2),
            },
          ],
        };
      }

      case 'get_domain_graph': {
        const domain = (args?.domain as string).replace(/\.trust$/, '');
        const graph = await fetchFromAPI(`/api/domains/${domain}/graph`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(graph, null, 2),
            },
          ],
        };
      }

      case 'discover_agents': {
        const params = new URLSearchParams();
        if (args?.capability) params.set('capability', args.capability as string);
        if (args?.type) params.set('type', args.type as string);
        const queryString = params.toString();
        const agents = await fetchFromAPI(`/api/agents/discover${queryString ? `?${queryString}` : ''}`);
        return {
          content: [
            {
              type: 'text',
              text: agents.agents?.length > 0
                ? JSON.stringify(agents, null, 2)
                : 'No agents found matching the criteria.',
            },
          ],
        };
      }

      case 'get_agent_info': {
        const domain = (args?.domain as string).replace(/\.trust$/, '');
        try {
          const agentInfo = await fetchFromAPI(`/api/agents/${domain}`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(agentInfo, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `No agent registered at ${domain}.trust`,
              },
            ],
          };
        }
      }

      case 'get_pricing': {
        const pricing = await fetchFromAPI('/api/pricing');
        return {
          content: [
            {
              type: 'text',
              text: `TNS Domain Pricing:\n${pricing.tiers.map((t: { description: string; pricePerYear: string }) => 
                `- ${t.description}: ${t.pricePerYear} ${pricing.currency}/year`
              ).join('\n')}`,
            },
          ],
        };
      }

      case 'search_atoms': {
        const uri = args?.uri as string;
        const atoms = await fetchFromAPI(`/api/knowledge-graph/atoms?uri=${encodeURIComponent(uri)}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(atoms, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TNS MCP Server running on stdio');
}

main().catch(console.error);
