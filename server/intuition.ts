import { configureClient, createServerClient } from '@0xintuition/graphql';

const API_URL_PROD = 'https://api.intuition.systems/graphql';

configureClient({ apiUrl: API_URL_PROD });

const intuitionClient = createServerClient({});

export interface DomainAtom {
  id: string;
  uri: string;
  domainName: string;
  owner: string;
  tokenId: string;
  expirationDate: string;
  pricingTier: string;
  totalStaked?: string;
  stakeholders?: number;
}

export interface AgentMetadata {
  type: 'ai-agent';
  agentType: string;
  capabilities: string[];
  endpoint?: string;
  publicKey?: string;
  version: string;
  registeredAt: number;
}

export interface DomainReputation {
  totalStaked: string;
  totalShares: string;
  stakeholders: number;
  reputationScore: number;
}

function getPricingTier(length: number): string {
  if (length === 3) return 'Premium (3 characters)';
  if (length === 4) return 'Standard (4 characters)';
  return 'Basic (5+ characters)';
}

function getPricePerYear(length: number): string {
  if (length === 3) return '100';
  if (length === 4) return '70';
  return '30';
}

export class IntuitionService {
  
  async queryAtoms(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    try {
      const result = await intuitionClient.request(query, variables);
      return result;
    } catch (error) {
      console.error('Intuition query error:', error);
      throw error;
    }
  }

  async searchAtomsByUri(uriContains: string): Promise<unknown[]> {
    const query = `
      query SearchAtoms($uriContains: String!) {
        atoms(where: { uri_contains: $uriContains }, first: 100) {
          id
          uri
          createdAt
          totalShares
          totalAssets
        }
      }
    `;
    
    try {
      const result = await this.queryAtoms(query, { uriContains }) as { atoms: unknown[] };
      return result.atoms || [];
    } catch (error) {
      console.error('Error searching atoms:', error);
      return [];
    }
  }

  async getAtomById(atomId: string): Promise<unknown | null> {
    const query = `
      query GetAtom($atomId: String!) {
        atom(id: $atomId) {
          id
          uri
          createdAt
          totalShares
          totalAssets
          vault {
            id
            curveId
            isActive
          }
          positions {
            id
            user
            shares
            assets
          }
        }
      }
    `;
    
    try {
      const result = await this.queryAtoms(query, { atomId }) as { atom: unknown };
      return result.atom;
    } catch (error) {
      console.error('Error getting atom:', error);
      return null;
    }
  }

  async getDomainTriples(domainUri: string): Promise<unknown[]> {
    const query = `
      query GetDomainTriples($uri: String!) {
        triples(where: { subject_: { uri_contains: $uri } }, first: 100) {
          id
          subject { id uri }
          predicate { id uri }
          object { id uri }
          createdAt
          positiveVault {
            totalShares
            totalAssets
          }
          negativeVault {
            totalShares
            totalAssets
          }
        }
      }
    `;
    
    try {
      const result = await this.queryAtoms(query, { uri: domainUri }) as { triples: unknown[] };
      return result.triples || [];
    } catch (error) {
      console.error('Error getting domain triples:', error);
      return [];
    }
  }

  async getTriplesByPredicate(predicateUri: string, objectUri?: string): Promise<unknown[]> {
    const query = objectUri
      ? `
        query GetTriplesByPredicateAndObject($predicateUri: String!, $objectUri: String!) {
          triples(where: { 
            predicate_: { uri_contains: $predicateUri },
            object_: { uri_contains: $objectUri }
          }, first: 100) {
            id
            subject { id uri totalAssets }
            predicate { id uri }
            object { id uri }
          }
        }
      `
      : `
        query GetTriplesByPredicate($predicateUri: String!) {
          triples(where: { predicate_: { uri_contains: $predicateUri } }, first: 100) {
            id
            subject { id uri totalAssets }
            predicate { id uri }
            object { id uri }
          }
        }
      `;
    
    try {
      const result = await this.queryAtoms(query, { predicateUri, objectUri }) as { triples: unknown[] };
      return result.triples || [];
    } catch (error) {
      console.error('Error getting triples by predicate:', error);
      return [];
    }
  }

  generateDomainAtomUri(domainName: string, ownerAddress: string): string {
    // Use CAIP-10 format to register as "account" type in Intuition Knowledge Graph
    // Format: CAIP10:eip155:{chainId}:{address}
    // Chain ID 1155 = Intuition mainnet
    // The owner address makes this an account-type atom
    return `CAIP10:eip155:1155:${ownerAddress}`;
  }
  
  generateAccountAtomUri(ownerAddress: string): string {
    // Standard CAIP-10 format for blockchain accounts
    // Chain ID 1155 = Intuition mainnet
    return `CAIP10:eip155:1155:${ownerAddress}`;
  }
  
  generateDomainLookupUri(domainName: string): string {
    // Legacy format for searching/matching existing text-based atoms
    const cleanName = domainName.replace('.trust', '');
    return `${cleanName}.trust`;
  }

  generateAgentAtomUri(domainName: string): string {
    const cleanName = domainName.replace('.trust', '');
    return `tns:agent:${cleanName}.trust`;
  }

  buildDomainAtomMetadata(
    domainName: string,
    owner: string,
    tokenId: string,
    expirationDate: Date,
    registrationDate?: Date
  ): DomainAtom {
    const cleanName = domainName.replace('.trust', '');
    const length = cleanName.length;
    
    return {
      id: '', // Will be set after atom creation
      uri: this.generateDomainAtomUri(domainName, owner),
      domainName: `${cleanName}.trust`,
      owner,
      tokenId,
      expirationDate: expirationDate.toISOString(),
      pricingTier: getPricingTier(length),
    };
  }

  async getDomainReputation(domainName: string, ownerAddress: string): Promise<DomainReputation | null> {
    const uri = this.generateDomainAtomUri(domainName, ownerAddress);
    
    try {
      const atoms = await this.searchAtomsByUri(uri) as Array<{
        id: string;
        totalAssets: string;
        totalShares: string;
        positions?: Array<{ id: string }>;
      }>;
      
      if (atoms.length === 0) {
        return {
          totalStaked: '0',
          totalShares: '0',
          stakeholders: 0,
          reputationScore: 0
        };
      }
      
      const atom = atoms[0];
      const totalAssets = parseFloat(atom.totalAssets || '0');
      const stakeholderCount = atom.positions?.length || 0;
      
      const reputationScore = Math.log10(totalAssets + 1) * Math.sqrt(stakeholderCount + 1);
      
      return {
        totalStaked: atom.totalAssets || '0',
        totalShares: atom.totalShares || '0',
        stakeholders: stakeholderCount,
        reputationScore
      };
    } catch (error) {
      console.error('Error getting domain reputation:', error);
      return null;
    }
  }

  async discoverAgentsByCapability(capability: string): Promise<unknown[]> {
    const query = `
      query DiscoverAgents($capabilityUri: String!) {
        triples(where: {
          predicate_: { uri_contains: "tns:predicate:hasCapability" },
          object_: { uri_contains: $capabilityUri }
        }, first: 50) {
          subject {
            id
            uri
            totalAssets
          }
        }
      }
    `;
    
    try {
      const result = await this.queryAtoms(query, { capabilityUri: capability }) as { triples: Array<{ subject: unknown }> };
      return result.triples?.map(t => t.subject) || [];
    } catch (error) {
      console.error('Error discovering agents:', error);
      return [];
    }
  }

  async getAgentDirectory(page: number = 1, limit: number = 20): Promise<unknown[]> {
    const query = `
      query GetAgentDirectory($first: Int!, $skip: Int!) {
        atoms(
          where: { uri_contains: "tns:agent:" },
          orderBy: totalAssets,
          orderDirection: desc,
          first: $first,
          skip: $skip
        ) {
          id
          uri
          totalAssets
          totalShares
          createdAt
        }
      }
    `;
    
    try {
      const result = await this.queryAtoms(query, { 
        first: limit, 
        skip: (page - 1) * limit 
      }) as { atoms: unknown[] };
      return result.atoms || [];
    } catch (error) {
      console.error('Error getting agent directory:', error);
      return [];
    }
  }

  async getDomainGraph(domainName: string, ownerAddress: string): Promise<{
    domain: string;
    atomId: string | null;
    reputation: DomainReputation | null;
    relationships: Array<{ predicate: string; object: string }>;
    references: Array<{ subject: string; predicate: string }>;
  }> {
    const uri = this.generateDomainAtomUri(domainName, ownerAddress);
    
    try {
      const atoms = await this.searchAtomsByUri(uri) as Array<{ id: string }>;
      const atomId = atoms.length > 0 ? atoms[0].id : null;
      
      const triples = atomId ? await this.getDomainTriples(uri) as Array<{
        predicate: { uri: string };
        object: { uri: string };
      }> : [];
      
      const reputation = await this.getDomainReputation(domainName, ownerAddress);
      
      const referenceTriples = await this.getTriplesByPredicate('tns:predicate:', uri) as Array<{
        subject: { uri: string };
        predicate: { uri: string };
      }>;
      
      return {
        domain: domainName,
        atomId,
        reputation,
        relationships: triples.map(t => ({
          predicate: t.predicate.uri,
          object: t.object.uri
        })),
        references: referenceTriples.map(t => ({
          subject: t.subject.uri,
          predicate: t.predicate.uri
        }))
      };
    } catch (error) {
      console.error('Error getting domain graph:', error);
      return {
        domain: domainName,
        atomId: null,
        reputation: null,
        relationships: [],
        references: []
      };
    }
  }
}

export const intuitionService = new IntuitionService();
