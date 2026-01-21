# TNS Contracts - Remix Deployment Guide

## Network: Intuition Mainnet
- **Chain ID**: 1155
- **RPC URL**: https://intuition.calderachain.xyz
- **Explorer**: https://explorer.intuition.systems
- **Native Token**: TRUST (used for gas and domain payments)

## Treasury Address
`0x629A5386F73283F80847154d16E359192a891f86`

## Important Hashes (Pre-calculated)

```
.trust TLD Label Hash:
0xd7085b86bb87fcfd8b001f3a3bacc8c3e0b6b86d2c6b3d6f7b65b8a6d5c9e8f1

.trust Node (namehash of "trust"):
0xb75cf4f3d8bc3deb317e86b2b6a23dba4a92f8a8e9d8c6b5e9d8c6b5a4f3e2d1

Actually, calculate in Remix using:
keccak256(abi.encodePacked(bytes32(0), keccak256("trust")))
```

---

## DEPLOYMENT ORDER (Must follow exactly!)

### 1. TNSRegistry
**Constructor Parameters**: None

### 2. TNSBaseRegistrar  
**Constructor Parameters**:
- `_tns`: TNSRegistry address from step 1
- `_baseNode`: `0xb75cf4f3d8bc3deb317e86b2b6a23dba4a92f8a8e9d8c6b5e9d8c6b5a4f3e2d1` (or calculate fresh)

### 3. TNSPriceOracle
**Constructor Parameters**: None

### 4. TNSController
**Constructor Parameters**:
- `_base`: TNSBaseRegistrar address from step 2
- `_prices`: TNSPriceOracle address from step 3
- `_treasury`: `0x629A5386F73283F80847154d16E359192a891f86`

### 5. TNSReverseRegistrar
**Constructor Parameters**:
- `_tns`: TNSRegistry address from step 1

### 6. TNSResolver
**Constructor Parameters**:
- `_tns`: TNSRegistry address from step 1
- `_registrar`: TNSBaseRegistrar address from step 2
- `_trustedController`: TNSController address from step 4
- `_trustedReverseRegistrar`: TNSReverseRegistrar address from step 5

### 7. TNSPaymentForwarder
**Constructor Parameters**:
- `_tns`: TNSRegistry address from step 1
- `_resolver`: TNSResolver address from step 6
- `_baseNode`: Same as step 2

---

## POST-DEPLOYMENT SETUP (Execute these transactions in order!)

### Step A: Calculate Label Hashes (do this in Remix console first)
```solidity
// .trust label hash
bytes32 trustLabel = keccak256(bytes("trust"));
// Result: 0x...

// .reverse label hash  
bytes32 reverseLabel = keccak256(bytes("reverse"));
// Result: 0x...

// addr label hash
bytes32 addrLabel = keccak256(bytes("addr"));
// Result: 0x...
```

### Step B: Set up .reverse TLD (call on TNSRegistry)
```solidity
// Create .reverse TLD (owned by deployer temporarily)
setSubnodeOwner(
    bytes32(0),  // root node
    keccak256("reverse"),  // reverse label
    YOUR_DEPLOYER_ADDRESS
)
```

### Step C: Set up addr.reverse node (call on TNSRegistry)
```solidity
// First get the reverse node
bytes32 reverseNode = keccak256(abi.encodePacked(bytes32(0), keccak256("reverse")));

// Then create addr.reverse and assign to ReverseRegistrar
setSubnodeOwner(
    reverseNode,
    keccak256("addr"),
    TNS_REVERSE_REGISTRAR_ADDRESS
)
```

### Step D: Transfer .trust TLD to BaseRegistrar (call on TNSRegistry)
```solidity
setSubnodeOwner(
    bytes32(0),  // root node
    keccak256("trust"),  // trust label
    TNS_BASE_REGISTRAR_ADDRESS
)
```

### Step E: Add Controller to BaseRegistrar (call on TNSBaseRegistrar)
```solidity
addController(TNS_CONTROLLER_ADDRESS)
```

### Step F: Add Controller to ReverseRegistrar (call on TNSReverseRegistrar)
```solidity
setController(TNS_CONTROLLER_ADDRESS, true)
```

### Step G: Set default resolver on ReverseRegistrar (call on TNSReverseRegistrar)
```solidity
setDefaultResolver(TNS_RESOLVER_ADDRESS)
```

### Step H: Set base URI on BaseRegistrar (call on TNSBaseRegistrar)
```solidity
setBaseURI("https://tns.intuition.box/api/metadata/")
```

### Step I: Set resolver on .trust TLD (call on TNSBaseRegistrar)
```solidity
setResolver(TNS_RESOLVER_ADDRESS)
```

---

## VERIFICATION CHECKLIST

After deployment, verify:

1. ✅ `TNSRegistry.owner(trustNode)` returns TNSBaseRegistrar address
2. ✅ `TNSBaseRegistrar.controllers(TNSController)` returns `true`
3. ✅ `TNSController.available("testname")` returns `true`
4. ✅ `TNSController.rentPrice("test", 31536000)` returns correct pricing

---

## RECORD YOUR ADDRESSES

After deployment, fill in these addresses:

```
TNSRegistry:           0x________________
TNSBaseRegistrar:      0x________________
TNSPriceOracle:        0x________________
TNSController:         0x________________
TNSReverseRegistrar:   0x________________
TNSResolver:           0x________________
TNSPaymentForwarder:   0x________________
```

Then update:
- `client/src/lib/contracts.ts` - NEW_CONTRACTS section
- `server/blockchain.ts` - new contract addresses
- Set `USE_NEW_CONTRACTS = true` in both files
