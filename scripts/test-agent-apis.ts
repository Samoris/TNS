import { ethers } from 'ethers';

const API_BASE = process.env.TNS_API_URL || 'http://localhost:5000';

async function testAgentAPIs() {
  console.log('='.repeat(60));
  console.log('TNS Agent Infrastructure Test Script');
  console.log('='.repeat(60));
  console.log(`API Base: ${API_BASE}\n`);

  // Test 1: Get Agent Schema
  console.log('1. Testing GET /api/agents/schema');
  console.log('-'.repeat(40));
  try {
    const schemaRes = await fetch(`${API_BASE}/api/agents/schema`);
    const schema = await schemaRes.json();
    console.log('Agent Types:', schema.agentTypes);
    console.log('Capabilities:', schema.capabilities?.slice(0, 5), '...');
    console.log('Reputation Tiers:', schema.reputationTiers);
    console.log('✓ Schema endpoint working\n');
  } catch (e) {
    console.error('✗ Schema endpoint failed:', e);
  }

  // Test 2: Agent Discovery
  console.log('2. Testing GET /api/agents/discover');
  console.log('-'.repeat(40));
  try {
    const discoverRes = await fetch(`${API_BASE}/api/agents/discover`);
    const discover = await discoverRes.json();
    console.log('Agents found:', discover.agents?.length || 0);
    if (discover.agents?.length > 0) {
      console.log('First agent:', discover.agents[0].domain);
    }
    console.log('✓ Discovery endpoint working\n');
  } catch (e) {
    console.error('✗ Discovery endpoint failed:', e);
  }

  // Test 3: Agent Directory
  console.log('3. Testing GET /api/agents/directory');
  console.log('-'.repeat(40));
  try {
    const dirRes = await fetch(`${API_BASE}/api/agents/directory`);
    const directory = await dirRes.json();
    console.log('Total agents:', directory.total);
    console.log('Page:', directory.page, 'Limit:', directory.limit);
    console.log('✓ Directory endpoint working\n');
  } catch (e) {
    console.error('✗ Directory endpoint failed:', e);
  }

  // Test 4: MCP Discovery
  console.log('4. Testing GET /api/agents/mcp/discover');
  console.log('-'.repeat(40));
  try {
    const mcpRes = await fetch(`${API_BASE}/api/agents/mcp/discover`);
    const mcp = await mcpRes.json();
    console.log('MCP-enabled agents:', mcp.agents?.length || 0);
    console.log('✓ MCP discovery endpoint working\n');
  } catch (e) {
    console.error('✗ MCP discovery endpoint failed:', e);
  }

  // Test 5: Authentication Challenge
  console.log('5. Testing POST /api/agents/auth/challenge');
  console.log('-'.repeat(40));
  try {
    const challengeRes = await fetch(`${API_BASE}/api/agents/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'test.trust' })
    });
    const challenge = await challengeRes.json();
    if (challenge.error) {
      console.log('Expected error (domain not found):', challenge.error);
    } else {
      console.log('Challenge received:', challenge.challenge?.substring(0, 20) + '...');
      console.log('Expires at:', new Date(challenge.expiresAt).toISOString());
    }
    console.log('✓ Auth challenge endpoint working\n');
  } catch (e) {
    console.error('✗ Auth challenge endpoint failed:', e);
  }

  // Test 6: Message Prepare
  console.log('6. Testing POST /api/agents/messages/prepare');
  console.log('-'.repeat(40));
  try {
    const prepareRes = await fetch(`${API_BASE}/api/agents/messages/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'sender.trust',
        to: 'receiver.trust',
        type: 'request',
        method: 'ping',
        payload: { message: 'Hello!' }
      })
    });
    const prepared = await prepareRes.json();
    console.log('From:', prepared.from);
    console.log('To:', prepared.to);
    console.log('Nonce:', prepared.nonce?.substring(0, 30) + '...');
    console.log('Signable payload length:', prepared.signablePayload?.length);
    console.log('✓ Message prepare endpoint working\n');
  } catch (e) {
    console.error('✗ Message prepare endpoint failed:', e);
  }

  // Test 7: Message Retrieval (should fail without auth)
  console.log('7. Testing GET /api/agents/messages/:domain (auth required)');
  console.log('-'.repeat(40));
  try {
    const msgRes = await fetch(`${API_BASE}/api/agents/messages/test.trust`);
    const messages = await msgRes.json();
    if (messages.error) {
      console.log('Expected auth error:', messages.error);
      console.log('Hint:', messages.hint);
    }
    console.log('✓ Message retrieval correctly requires authentication\n');
  } catch (e) {
    console.error('✗ Message retrieval endpoint failed:', e);
  }

  // Test 8: Agent Registration (mock - will fail without real domain)
  console.log('8. Testing POST /api/agents/register');
  console.log('-'.repeat(40));
  try {
    const registerRes = await fetch(`${API_BASE}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domainName: 'testbot.trust',
        agentType: 'assistant',
        capabilities: ['text-generation'],
        endpoint: 'https://example.com/api',
        owner: '0x0000000000000000000000000000000000000000'
      })
    });
    const register = await registerRes.json();
    if (register.error) {
      console.log('Expected error:', register.error);
    } else {
      console.log('Registered:', register.domain);
    }
    console.log('✓ Registration endpoint working\n');
  } catch (e) {
    console.error('✗ Registration endpoint failed:', e);
  }

  // Test 9: Agent Reputation
  console.log('9. Testing GET /api/agents/:domain/reputation');
  console.log('-'.repeat(40));
  try {
    const repRes = await fetch(`${API_BASE}/api/agents/test/reputation`);
    const reputation = await repRes.json();
    console.log('Reputation response:', JSON.stringify(reputation, null, 2));
    console.log('✓ Reputation endpoint working\n');
  } catch (e) {
    console.error('✗ Reputation endpoint failed:', e);
  }

  console.log('='.repeat(60));
  console.log('Test Complete!');
  console.log('='.repeat(60));
}

// Interactive test with wallet
async function interactiveTest() {
  console.log('\n' + '='.repeat(60));
  console.log('Interactive Agent Test (requires private key)');
  console.log('='.repeat(60));
  
  const privateKey = process.env.TEST_PRIVATE_KEY;
  const testDomain = process.env.TEST_DOMAIN;
  
  if (!privateKey || !testDomain) {
    console.log('\nTo run interactive tests, set environment variables:');
    console.log('  TEST_PRIVATE_KEY=0x... (domain owner private key)');
    console.log('  TEST_DOMAIN=yourdomain.trust');
    return;
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`\nUsing wallet: ${wallet.address}`);
  console.log(`Testing domain: ${testDomain}`);

  // Auth Challenge Flow
  console.log('\n1. Authentication Flow');
  console.log('-'.repeat(40));
  
  const challengeRes = await fetch(`${API_BASE}/api/agents/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: testDomain })
  });
  const challenge = await challengeRes.json();
  
  if (challenge.error) {
    console.log('Challenge error:', challenge.error);
    return;
  }

  console.log('Challenge received, signing...');
  const signature = await wallet.signMessage(challenge.message);
  
  const verifyRes = await fetch(`${API_BASE}/api/agents/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: testDomain,
      signature,
      address: wallet.address
    })
  });
  const verify = await verifyRes.json();
  console.log('Verification result:', verify);

  // Message Send Flow
  console.log('\n2. Message Send Flow');
  console.log('-'.repeat(40));

  const prepareRes = await fetch(`${API_BASE}/api/agents/messages/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: testDomain,
      to: testDomain, // send to self for testing
      type: 'notification',
      payload: { test: true, timestamp: Date.now() }
    })
  });
  const prepared = await prepareRes.json();
  console.log('Message prepared, nonce:', prepared.nonce);

  const msgSignature = await wallet.signMessage(prepared.signablePayload);
  
  const sendRes = await fetch(`${API_BASE}/api/agents/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: prepared.from,
      to: prepared.to,
      type: 'notification',
      payload: { test: true, timestamp: Date.now() },
      nonce: prepared.nonce,
      signature: msgSignature
    })
  });
  const send = await sendRes.json();
  console.log('Send result:', send);

  // Retrieve Messages
  console.log('\n3. Retrieve Messages');
  console.log('-'.repeat(40));

  const timestamp = Date.now().toString();
  const retrieveMessage = `Get messages for ${testDomain} at ${timestamp}`;
  const retrieveSignature = await wallet.signMessage(retrieveMessage);

  const messagesRes = await fetch(
    `${API_BASE}/api/agents/messages/${testDomain}?signature=${encodeURIComponent(retrieveSignature)}&timestamp=${timestamp}`
  );
  const messages = await messagesRes.json();
  console.log('Messages retrieved:', messages.count);
  if (messages.messages?.length > 0) {
    console.log('Latest message:', messages.messages[0]);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Interactive Test Complete!');
  console.log('='.repeat(60));
}

// Run tests
testAgentAPIs()
  .then(() => interactiveTest())
  .catch(console.error);
