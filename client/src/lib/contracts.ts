// TNS Contract Configuration - ERC721 NFT Contract (UPDATE THIS ADDRESS AFTER DEPLOYMENT)
export const TNS_REGISTRY_ADDRESS = "0xdfe1aB8532925de628C419B65B41f23997c34B4a";

// TNS Registry ABI - ERC721 NFT contract with security features
export const TNS_REGISTRY_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "commitment", "type": "bytes32" }
    ],
    "name": "makeCommitment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" },
      { "internalType": "bytes32", "name": "secret", "type": "bytes32" }
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
    "name": "isInGracePeriod",
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
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextTokenId",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "tokenURI",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "ownerOf",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_COMMITMENT_AGE",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_COMMITMENT_AGE",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_REGISTRATION_INTERVAL",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "GRACE_PERIOD",
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
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "renew",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "setPrimaryDomain",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "getPrimaryDomain",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "PrimaryDomainSet",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" },
      { "internalType": "address", "name": "resolverAddress", "type": "address" }
    ],
    "name": "setResolver",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "domain", "type": "string" }
    ],
    "name": "resolver",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "string", "name": "domain", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "resolver", "type": "address" }
    ],
    "name": "ResolverChanged",
    "type": "event"
  }
];

// TNS Resolver Contract (UPDATE THIS ADDRESS AFTER DEPLOYMENT)
export const TNS_RESOLVER_ADDRESS = "0x259037FCc807Ca46549e8a15F6F4994e96D88035";

// TNS Resolver ABI - Handles domain resolution (addresses, content hashes, text records)
export const TNS_RESOLVER_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "registryAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newAddress",
        "type": "address"
      }
    ],
    "name": "AddressChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "contenthash",
        "type": "bytes"
      }
    ],
    "name": "ContenthashChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "ResolverCleared",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "value",
        "type": "string"
      }
    ],
    "name": "TextChanged",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "addr",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "clearRecords",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "contenthash",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "getAllTextRecords",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "keys",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "values",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "getResolverData",
    "outputs": [
      {
        "internalType": "address",
        "name": "ethAddress",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "contentHash",
        "type": "bytes"
      },
      {
        "internalType": "string[]",
        "name": "textKeys",
        "type": "string[]"
      },
      {
        "internalType": "string[]",
        "name": "textValues",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedTextKeys",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      }
    ],
    "name": "isTextKeySupported",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registry",
    "outputs": [
      {
        "internalType": "contract ITNSRegistry",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "newAddress",
        "type": "address"
      }
    ],
    "name": "setAddr",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "hash",
        "type": "bytes"
      }
    ],
    "name": "setContenthash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "value",
        "type": "string"
      }
    ],
    "name": "setText",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      }
    ],
    "name": "text",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// TNS Payment Forwarder Contract (UPDATE THIS ADDRESS AFTER DEPLOYMENT)
export const TNS_PAYMENT_FORWARDER_ADDRESS = "0x0000000000000000000000000000000000000000"; // UPDATE AFTER DEPLOYMENT

// TNS Payment Forwarder ABI - Handles payments to .trust domains
export const TNS_PAYMENT_FORWARDER_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "registryAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "PaymentFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "domain",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PaymentSent",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "domains",
        "type": "string[]"
      }
    ],
    "name": "batchResolvePaymentAddress",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "addresses",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registry",
    "outputs": [
      {
        "internalType": "contract ITNSRegistry",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "resolvePaymentAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "domain",
        "type": "string"
      }
    ],
    "name": "sendToTrustDomain",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];