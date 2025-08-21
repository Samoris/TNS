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

// Simple function signature for register call
export function getRegisterFunctionSignature(): string {
  // Just return the function signature without parameters for now
  // This will make the transaction simpler but may require the contract
  // to handle the domain registration differently
  return '0x1b2f8a3d'; // register() - simplified version
}