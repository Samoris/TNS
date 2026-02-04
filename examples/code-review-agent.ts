/**
 * Code Review Agent - Example Implementation
 * 
 * A complete example of an AI agent using TNS .trust identity
 * to provide code review services to other agents.
 * 
 * This demonstrates:
 * - Agent registration with .trust domain
 * - Challenge-response authentication
 * - Discovering other agents
 * - Receiving and responding to code review requests
 * - Building reputation through staking
 * 
 * Run: npx tsx examples/code-review-agent.ts
 */

import { ethers } from 'ethers';

// ============= Configuration =============

const CONFIG = {
  TNS_API_URL: process.env.TNS_API_URL || 'https://tns.intuition.box',
  AGENT_DOMAIN: process.env.AGENT_DOMAIN || 'codereviewer.trust',
  AGENT_PRIVATE_KEY: process.env.AGENT_PRIVATE_KEY || '',
  POLL_INTERVAL_MS: 10000,
  ENDPOINT_URL: process.env.ENDPOINT_URL,
  MCP_ENDPOINT_URL: process.env.MCP_ENDPOINT_URL,
};

// ============= Types =============

interface CodeReviewRequest {
  code: string;
  language: string;
  context?: string;
  strict?: boolean;
}

interface CodeReviewResult {
  requestId: string;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
  score: number;
  summary: string;
}

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  payload: unknown;
  timestamp: number;
  signature: string;
  nonce: string;
}

// ============= Code Review Agent =============

class CodeReviewAgent {
  private wallet: ethers.Wallet;
  private domain: string;
  private apiUrl: string;
  private running = false;

  constructor() {
    if (!CONFIG.AGENT_PRIVATE_KEY) {
      throw new Error('AGENT_PRIVATE_KEY environment variable required');
    }
    
    this.wallet = new ethers.Wallet(CONFIG.AGENT_PRIVATE_KEY);
    this.domain = CONFIG.AGENT_DOMAIN;
    this.apiUrl = CONFIG.TNS_API_URL;
    
    console.log(`Code Review Agent initialized`);
    console.log(`  Domain: ${this.domain}`);
    console.log(`  Address: ${this.wallet.address}`);
  }

  // --- API Helpers ---

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  }

  // --- Lifecycle ---

  async register(): Promise<void> {
    console.log('Registering agent...');
    
    try {
      const result = await this.fetch<{ success: boolean; domain: string }>(
        '/api/agents/register',
        {
          method: 'POST',
          body: JSON.stringify({
            domainName: this.domain,
            agentType: 'analyzer',
            capabilities: ['code-review', 'code-generation'],
            endpoint: CONFIG.ENDPOINT_URL,
            mcpEndpoint: CONFIG.MCP_ENDPOINT_URL,
            owner: this.wallet.address,
          }),
        }
      );
      
      console.log(`✓ Registered as ${result.domain}`);
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        console.log('✓ Already registered');
      } else {
        throw error;
      }
    }
  }

  async authenticate(): Promise<void> {
    console.log('Authenticating...');
    
    // Get challenge
    const challenge = await this.fetch<{
      message: string;
      expiresAt: number;
    }>('/api/agents/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ domain: this.domain }),
    });

    // Sign challenge
    const signature = await this.wallet.signMessage(challenge.message);

    // Verify
    const result = await this.fetch<{ authenticated: boolean }>(
      '/api/agents/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({
          domain: this.domain,
          signature,
          address: this.wallet.address,
        }),
      }
    );

    if (result.authenticated) {
      console.log('✓ Authenticated successfully');
    } else {
      throw new Error('Authentication failed');
    }
  }

  // --- Message Handling ---

  async getMessages(): Promise<AgentMessage[]> {
    const timestamp = Date.now().toString();
    const message = `Get messages for ${this.domain} at ${timestamp}`;
    const signature = await this.wallet.signMessage(message);

    const data = await this.fetch<{ messages: AgentMessage[] }>(
      `/api/agents/messages/${encodeURIComponent(this.domain)}?` +
      `signature=${encodeURIComponent(signature)}&timestamp=${timestamp}`
    );

    return data.messages || [];
  }

  async sendResponse(
    to: string,
    method: string,
    payload: unknown
  ): Promise<void> {
    // Prepare message
    const prepared = await this.fetch<{
      nonce: string;
      signablePayload: string;
    }>('/api/agents/messages/prepare', {
      method: 'POST',
      body: JSON.stringify({
        from: this.domain,
        to,
        type: 'response',
        method,
        payload,
      }),
    });

    // Sign
    const signature = await this.wallet.signMessage(prepared.signablePayload);

    // Send
    await this.fetch('/api/agents/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        from: this.domain,
        to,
        type: 'response',
        method,
        payload,
        nonce: prepared.nonce,
        signature,
      }),
    });

    console.log(`  → Sent response to ${to}`);
  }

  // --- Code Review Logic ---

  private reviewCode(request: CodeReviewRequest): CodeReviewResult {
    const issues: CodeReviewResult['issues'] = [];
    let score = 100;

    const code = request.code;
    const lines = code.split('\n');

    // Simple static analysis rules
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for console.log in production code
      if (line.includes('console.log')) {
        issues.push({
          severity: 'warning',
          line: lineNum,
          message: 'Avoid console.log in production code',
          suggestion: 'Use a proper logging library',
        });
        score -= 5;
      }

      // Check for TODO comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        issues.push({
          severity: 'info',
          line: lineNum,
          message: 'Unresolved TODO/FIXME comment',
        });
        score -= 2;
      }

      // Check for very long lines
      if (line.length > 120) {
        issues.push({
          severity: 'warning',
          line: lineNum,
          message: `Line exceeds 120 characters (${line.length})`,
          suggestion: 'Break into multiple lines for readability',
        });
        score -= 3;
      }

      // Check for var usage in JavaScript/TypeScript
      if (
        (request.language === 'javascript' || request.language === 'typescript') &&
        /\bvar\s+/.test(line)
      ) {
        issues.push({
          severity: 'error',
          line: lineNum,
          message: 'Avoid using var, use const or let instead',
          suggestion: 'Replace var with const for immutable values or let for mutable',
        });
        score -= 10;
      }

      // Check for == instead of === in JavaScript
      if (
        request.language === 'javascript' &&
        /[^=!]==[^=]/.test(line)
      ) {
        issues.push({
          severity: 'error',
          line: lineNum,
          message: 'Use strict equality (===) instead of loose equality (==)',
          suggestion: 'Replace == with ===',
        });
        score -= 8;
      }
    });

    // Check for missing error handling
    if (
      code.includes('async') &&
      !code.includes('try') &&
      !code.includes('catch')
    ) {
      issues.push({
        severity: 'warning',
        message: 'Async code without error handling',
        suggestion: 'Add try/catch blocks or .catch() for error handling',
      });
      score -= 10;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Generate summary
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const infoCount = issues.filter((i) => i.severity === 'info').length;

    let summary = '';
    if (score >= 90) {
      summary = 'Excellent code quality with minor suggestions.';
    } else if (score >= 70) {
      summary = 'Good code quality with some improvements needed.';
    } else if (score >= 50) {
      summary = 'Fair code quality with multiple issues to address.';
    } else {
      summary = 'Code needs significant improvements before production use.';
    }

    summary += ` Found ${errorCount} errors, ${warningCount} warnings, and ${infoCount} informational notes.`;

    return {
      requestId: '', // Will be set by caller
      issues,
      score,
      summary,
    };
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    console.log(`← Received ${message.type} from ${message.from}`);

    if (message.type === 'request' && message.method === 'reviewCode') {
      const request = message.payload as CodeReviewRequest;
      
      console.log(`  Processing code review (${request.language}, ${request.code.length} chars)`);

      // Perform review
      const result = this.reviewCode(request);
      result.requestId = message.id;

      // Send response
      await this.sendResponse(message.from, 'codeReviewResult', result);
      
      console.log(`  Review complete: score ${result.score}, ${result.issues.length} issues`);
    } else {
      console.log(`  Ignoring ${message.type} message with method: ${message.method}`);
    }
  }

  // --- Main Loop ---

  async run(): Promise<void> {
    this.running = true;
    
    console.log('\nStarting message polling loop...');
    console.log(`Polling every ${CONFIG.POLL_INTERVAL_MS / 1000}s\n`);

    while (this.running) {
      try {
        const messages = await this.getMessages();
        
        if (messages.length > 0) {
          console.log(`\nReceived ${messages.length} message(s)`);
          
          for (const message of messages) {
            try {
              await this.handleMessage(message);
            } catch (error) {
              console.error(`Error handling message ${message.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }

      await new Promise((resolve) => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
    }
  }

  stop(): void {
    this.running = false;
    console.log('Stopping agent...');
  }
}

// ============= Main Entry Point =============

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         TNS Code Review Agent - Example');
  console.log('═══════════════════════════════════════════════════════\n');

  const agent = new CodeReviewAgent();

  // Register and authenticate
  await agent.register();
  await agent.authenticate();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down...');
    agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    agent.stop();
    process.exit(0);
  });

  // Start the main loop
  await agent.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
