// TNS Contract Configuration - New Optimized Contract (checksummed address)
export const TNS_REGISTRY_ADDRESS = "0xb4D38068F8982c15CaD9f98adE6C2954567e2153";

// TNS Registry ABI - Optimized contract functions
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
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "getDomainInfo",
    "outputs": [
      { "internalType": "address", "name": "domainOwner", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "expirationTime", "type": "uint256" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "domainOwner", "type": "address" }
    ],
    "name": "getOwnerDomains",
    "outputs": [
      { "internalType": "string[]", "name": "", "type": "string[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "name": "domains",
    "outputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "expirationTime", "type": "uint256" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
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
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];

// Simple function signature for register call
export function getRegisterFunctionSignature(): string {
  // Just return the function signature without parameters for now
  // This will make the transaction simpler but may require the contract
  // to handle the domain registration differently
  return '0x1b2f8a3d'; // register() - simplified version
}