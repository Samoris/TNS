// TNS Contract Configuration
export const TNS_REGISTRY_ADDRESS = "0xa62957F219577FDEE87614D1E57E954ae4A09390";

// TNS Registry ABI - Essential functions for domain registration
export const TNS_REGISTRY_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "calculateCost",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "isAvailable",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "getDomainOwner",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "name": "domainToTokenId",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "name": "domainExpiration",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "string", "name": "domain", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "expirationTime", "type": "uint256" }
    ],
    "name": "DomainRegistered",
    "type": "event"
  }
];

// Helper functions for contract interaction
export function encodeFunctionCall(functionName: string, params: any[]): string {
  // Simple ABI encoding for common functions
  const functionSignatures: { [key: string]: string } = {
    'register': '0x65fae35e' // register(string,uint256)
  };
  
  const signature = functionSignatures[functionName];
  if (!signature) {
    throw new Error(`Unknown function: ${functionName}`);
  }
  
  // For register function: encode domain string and duration uint256
  if (functionName === 'register') {
    const [domain, duration] = params;
    
    // Simple encoding - this is a basic implementation
    // In production, you'd use a proper ABI encoder like ethers.js
    const domainHex = Array.from(new TextEncoder().encode(domain))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const durationHex = duration.toString(16).padStart(64, '0');
    
    return signature + '0000000000000000000000000000000000000000000000000000000000000040' + 
           durationHex + 
           (domainHex.length / 2).toString(16).padStart(64, '0') + 
           domainHex + '00'.repeat(32 - (domainHex.length / 2) % 32);
  }
  
  return signature;
}