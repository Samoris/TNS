// TNS ENS-Forked Contract Configuration
// These contracts follow the ENS architecture adapted for TRUST ERC-20 token payments

// ============================================
// ENS-FORKED CONTRACT ADDRESSES (DEPLOYED ON INTUITION MAINNET)
// ============================================
export const TNS_REGISTRY_ADDRESS = "0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99";
export const TNS_BASE_REGISTRAR_ADDRESS = "0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4";
export const TNS_CONTROLLER_ADDRESS = "0x8A5F965e8D5e6330f99B81674670aC6f643F1A8C";
export const TNS_RESOLVER_ADDRESS = "0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5";
export const TNS_REVERSE_REGISTRAR_ADDRESS = "0x78Cd4f5149060De05a84040283812b0c056972eD";
export const TNS_PRICE_ORACLE_ADDRESS = "0x6F258639D183Fb7955B93d086FA9300eED79383A";
export const TNS_PAYMENT_FORWARDER_ADDRESS = "0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F";

// TRUST is the native token on Intuition (like ETH on Ethereum) - no ERC-20 address needed
export const TRUST_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // Native token


// ============================================
// TRUST ERC-20 TOKEN ABI (for approvals)
// ============================================
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  }
];

// ============================================
// TNS REGISTRY ABI (ENS-forked)
// ============================================
export const TNS_REGISTRY_ABI = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "ttl",
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "owner", type: "address" }
    ],
    name: "setOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" }
    ],
    name: "setSubnodeOwner",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "resolver", type: "address" }
    ],
    name: "setResolver",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "recordExists",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

// ============================================
// TNS BASE REGISTRAR ABI (ERC-721 + Domain Management)
// ============================================
export const TNS_BASE_REGISTRAR_ABI = [
  // ERC-721 functions
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Domain-specific functions
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "nameExpires",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "available",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "GRACE_PERIOD",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "baseNode",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "id", type: "uint256" },
      { name: "owner", type: "address" }
    ],
    name: "reclaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "expires", type: "uint256" }
    ],
    name: "NameRegistered",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: false, name: "expires", type: "uint256" }
    ],
    name: "NameRenewed",
    type: "event"
  }
];

// ============================================
// TNS CONTROLLER ABI (Registration with Commit-Reveal + Native TRUST Payments)
// Note: TRUST is the native token on Intuition (like ETH on Ethereum)
// Users send TRUST directly with the transaction (payable functions)
// ============================================
export const TNS_CONTROLLER_ABI = [
  // Commit-reveal registration (payable - sends native TRUST)
  {
    inputs: [{ name: "commitment", type: "bytes32" }],
    name: "commit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "duration", type: "uint256" },
      { name: "secret", type: "bytes32" }
    ],
    name: "register",
    outputs: [],
    stateMutability: "payable", // Accepts native TRUST
    type: "function"
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" }
    ],
    name: "renew",
    outputs: [],
    stateMutability: "payable", // Accepts native TRUST
    type: "function"
  },
  // View functions
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "secret", type: "bytes32" }
    ],
    name: "makeCommitment",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [{ name: "commitment", type: "bytes32" }],
    name: "commitments",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "available",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" }
    ],
    name: "rentPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Constants
  {
    inputs: [],
    name: "MIN_COMMITMENT_AGE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MAX_COMMITMENT_AGE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MIN_REGISTRATION_DURATION",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "name", type: "string" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "cost", type: "uint256" },
      { indexed: false, name: "expires", type: "uint256" }
    ],
    name: "NameRegistered",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "name", type: "string" },
      { indexed: false, name: "cost", type: "uint256" },
      { indexed: false, name: "expires", type: "uint256" }
    ],
    name: "NameRenewed",
    type: "event"
  }
];

// ============================================
// TNS RESOLVER ABI (Address, Text, Contenthash, Name)
// ============================================
export const TNS_RESOLVER_ABI = [
  // Address resolution
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "addr",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" }
    ],
    name: "setAddr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Text records
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" }
    ],
    name: "text",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" }
    ],
    name: "setText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Contenthash
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "contenthash",
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" }
    ],
    name: "setContenthash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Name (reverse resolution)
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "name", type: "string" }
    ],
    name: "setName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "node", type: "bytes32" },
      { indexed: false, name: "addr", type: "address" }
    ],
    name: "AddrChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "node", type: "bytes32" },
      { indexed: true, name: "key", type: "string" },
      { indexed: false, name: "value", type: "string" }
    ],
    name: "TextChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "node", type: "bytes32" },
      { indexed: false, name: "hash", type: "bytes" }
    ],
    name: "ContenthashChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "node", type: "bytes32" },
      { indexed: false, name: "name", type: "string" }
    ],
    name: "NameChanged",
    type: "event"
  }
];

// ============================================
// TNS REVERSE REGISTRAR ABI
// ============================================
export const TNS_REVERSE_REGISTRAR_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "claim",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "setName",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "name", type: "string" }
    ],
    name: "setNameForAddr",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "node",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [],
    name: "defaultResolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];

// ============================================
// TNS PRICE ORACLE ABI
// ============================================
export const TNS_PRICE_ORACLE_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" }
    ],
    name: "price",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "price3Char",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "price4Char",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "price5PlusChar",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

// ============================================
// TNS PAYMENT FORWARDER ABI (ENS-forked contract)
// ============================================
export const TNS_PAYMENT_FORWARDER_ABI = [
  {
    inputs: [{ name: "name", type: "string" }],
    name: "sendTo",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "resolve",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "namehash",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "name", type: "string" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "PaymentForwarded",
    type: "event"
  }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate namehash for a domain (ENS-style)
 */
export function namehash(domain: string): string {
  let node = "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (domain === "") return node;

  const labels = domain.split(".").reverse();
  for (const label of labels) {
    const labelHash = keccak256(label);
    node = keccak256(node + labelHash.slice(2));
  }
  return node;
}

/**
 * Calculate keccak256 hash (browser-compatible)
 */
export function keccak256(data: string): string {
  // This uses ethers.js keccak256 - import it in your component
  // For now, return a placeholder that should be replaced with actual implementation
  if (typeof window !== "undefined" && (window as unknown as { ethers?: { keccak256?: (data: string) => string; toUtf8Bytes?: (text: string) => Uint8Array } }).ethers) {
    const ethers = (window as unknown as { ethers: { keccak256: (data: string | Uint8Array) => string; toUtf8Bytes: (text: string) => Uint8Array } }).ethers;
    if (data.startsWith("0x")) {
      return ethers.keccak256(data);
    }
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }
  throw new Error("ethers not available for keccak256");
}

/**
 * Calculate labelhash for a single label
 */
export function labelhash(label: string): string {
  return keccak256(label);
}

/**
 * Get the active contract addresses
 */
export function getActiveContracts() {
  return {
    registry: TNS_REGISTRY_ADDRESS,
    registrar: TNS_BASE_REGISTRAR_ADDRESS,
    controller: TNS_CONTROLLER_ADDRESS,
    resolver: TNS_RESOLVER_ADDRESS,
    reverseRegistrar: TNS_REVERSE_REGISTRAR_ADDRESS,
    priceOracle: TNS_PRICE_ORACLE_ADDRESS,
    paymentForwarder: TNS_PAYMENT_FORWARDER_ADDRESS,
    trustToken: TRUST_TOKEN_ADDRESS,
  };
}
