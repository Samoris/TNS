# TNS Contract Security Verification Guide

This guide explains how to verify the security of the TNS (Trust Name Service) smart contracts deployed on Intuition Mainnet.

---

## Table of Contents

1. [Source Code Verification](#1-source-code-verification)
2. [ENS Codebase Comparison](#2-ens-codebase-comparison)
3. [Custom Contract Audit](#3-custom-contract-audit)
4. [On-Chain Verification](#4-on-chain-verification)
5. [Common Vulnerability Checklist](#5-common-vulnerability-checklist)

---

## 1. Source Code Verification

### Step 1: Verify Contracts on Explorer

All TNS V3 contracts are verified on the Intuition Explorer. You can view the source code directly:

| Contract | Verified Source |
|----------|-----------------|
| TNSRegistry | [View Code](https://explorer.intuition.systems/address/0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e#code) |
| BaseRegistrar | [View Code](https://explorer.intuition.systems/address/0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629#code) |
| ETHRegistrarController | [View Code](https://explorer.intuition.systems/address/0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80#code) |
| Resolver | [View Code](https://explorer.intuition.systems/address/0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b#code) |
| ReverseRegistrar | [View Code](https://explorer.intuition.systems/address/0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080#code) |
| StablePriceOracle | [View Code](https://explorer.intuition.systems/address/0x77C5F276dd8f7321E42580AC53E73859C080A0f2#code) |
| Root | [View Code](https://explorer.intuition.systems/address/0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24#code) |
| DummyOracle | [View Code](https://explorer.intuition.systems/address/0x903cc70Cda037249e8D1870Bcd6C528710B73b7E#code) |
| PaymentForwarder | [View Code](https://explorer.intuition.systems/address/0xF661722f065D8606CC6b5be84296D67D9fe7bD13#code) |

### Step 2: Compare with Repository

Clone and compare the deployed bytecode:

```bash
# Clone the repository
git clone <repository-url>
cd contracts/tns-ens

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Compare bytecode (example for TNSRegistry)
npx hardhat verify --network intuition 0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e
```

---

## 2. ENS Codebase Comparison

TNS is forked from the battle-tested ENS contracts. To verify the fork integrity:

### Step 1: Get Original ENS Source

```bash
# Clone official ENS contracts
git clone https://github.com/ensdomains/ens-contracts.git
cd ens-contracts
git checkout v0.0.21  # Version used as base
```

### Step 2: Compare Core Contracts

Use a diff tool to compare TNS contracts with ENS originals:

| TNS Contract | ENS Original | Expected Differences |
|--------------|--------------|---------------------|
| `registry/TNSRegistry.sol` | `registry/ENSRegistry.sol` | Interface name only |
| `ethregistrar/BaseRegistrarImplementation.sol` | `ethregistrar/BaseRegistrarImplementation.sol` | Minimal changes |
| `ethregistrar/ETHRegistrarController.sol` | `ethregistrar/ETHRegistrarController.sol` | Simplified makeCommitment, re-commit logic |
| `resolvers/Resolver.sol` | `resolvers/PublicResolver.sol` | Simplified version |
| `reverseRegistrar/ReverseRegistrar.sol` | `reverseRegistrar/ReverseRegistrar.sol` | Minimal changes |

### Step 3: Key Modifications to Review

```bash
# Search for TNS-specific changes
grep -r "TRUST" contracts/
grep -r "0xe16bcebb" contracts/  # TRUST_NODE constant
grep -r "1155" contracts/         # Chain ID
```

**Expected modifications:**
- `ETH_NODE` -> `TRUST_NODE` (namehash constant)
- Interface imports: `ENS` -> `TNS`
- Token name in comments: ETH -> TRUST

---

## 3. Custom Contract Audit

### PaymentForwarder (Custom Contract)

The PaymentForwarder is the **only non-ENS contract**. Review it carefully:

**Location:** `contracts/tns-ens/utils/PaymentForwarder.sol`

#### Security Checklist

```solidity
// No storage variables (stateless)
TNS public immutable tns;

// No admin/owner functions (permissionless)
// No onlyOwner modifiers

// No upgradeable patterns (immutable)
// No proxy, no delegatecall

// Explicit error handling
error DomainNotRegistered(string name);
error NoResolverSet(string name);
error NoAddressSet(string name);
error PaymentFailed();

// CEI pattern (Checks-Effects-Interactions)
// All checks happen before the external call

// Event emission for tracking
event PaymentForwarded(string indexed name, address indexed from, address indexed to, uint256 amount);
```

#### Manual Review Points

1. **Reentrancy Risk**: Low
   - No state changes after external call
   - Uses `call` with empty data (standard transfer)

2. **Resolver Trust**: Medium
   - Trusts resolver to return correct address
   - Resolver is set by domain owner only
   - Malicious resolver could return attacker address

3. **Gas Griefing**: Low
   - Recipient could consume all gas in receive()
   - Mitigated by gas limit in frontend

---

## 4. On-Chain Verification

### Step 1: Verify Contract Relationships

```javascript
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("https://intuition.calderachain.xyz");

// V3 Contract addresses
const REGISTRY = "0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e";
const REGISTRAR = "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629";
const CONTROLLER = "0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80";
const RESOLVER = "0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b";

// Calculate TRUST_NODE
const TRUST_LABEL = ethers.keccak256(ethers.toUtf8Bytes("trust"));
const ROOT_NODE = ethers.ZeroHash;
const TRUST_NODE = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "bytes32"], [ROOT_NODE, TRUST_LABEL])
);

console.log("TRUST_NODE:", TRUST_NODE);
// Expected: 0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985

// Verify .trust TLD owner is BaseRegistrar
const registryAbi = ["function owner(bytes32 node) view returns (address)"];
const registry = new ethers.Contract(REGISTRY, registryAbi, provider);
const trustOwner = await registry.owner(TRUST_NODE);
console.log(".trust TLD owner:", trustOwner);
console.log("Expected (BaseRegistrar):", REGISTRAR);
console.log("Match:", trustOwner === REGISTRAR);
```

### Step 2: Verify Controller Authorization

```javascript
// Check if Controller is authorized on BaseRegistrar
const registrarAbi = ["function controllers(address) view returns (bool)"];
const registrar = new ethers.Contract(REGISTRAR, registrarAbi, provider);
const isController = await registrar.controllers(CONTROLLER);
console.log("Controller authorized:", isController);
// Expected: true
```

### Step 3: Verify Fee Handling

```javascript
// In V3, fees stay in the controller contract
// Owner can withdraw using withdraw()
const controllerAbi = ["function owner() view returns (address)"];
const controller = new ethers.Contract(CONTROLLER, controllerAbi, provider);
const owner = await controller.owner();
console.log("Controller owner (can withdraw fees):", owner);
// Expected: 0xDC1DE801d1a38cBCFBc91Ca019c0F2fCcAf1AD14
```

---

## 5. Common Vulnerability Checklist

### Registry (TNSRegistry.sol)

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| Unauthorized ownership changes | Safe | Only owner can transfer |
| Resolver manipulation | Safe | Only owner can set |
| Subdomain attacks | Safe | Requires parent ownership |

### Registrar (BaseRegistrarImplementation.sol)

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| Unauthorized minting | Safe | Controller-only |
| Transfer during grace | Safe | NFT frozen during grace |
| Expiry manipulation | Safe | Only extends, never reduces |

### Controller (ETHRegistrarController.sol)

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| Front-running | Safe | Commit-reveal scheme |
| Commitment replay | Safe | Consumed on register |
| Price manipulation | Safe | Oracle is immutable |
| Reentrancy | Safe | ReentrancyGuard used |

### Resolver (Resolver.sol)

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| Unauthorized record changes | Safe | Owner/authorized only |
| Multicall issues | Safe | Delegatecall protected |

### PaymentForwarder (PaymentForwarder.sol)

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| Reentrancy | Low Risk | No state after call |
| Resolver trust | Medium | Domain owner controls |
| Zero address | Safe | Explicit revert |

---

## Quick Security Summary

| Component | Origin | Security Level | Notes |
|-----------|--------|----------------|-------|
| TNSRegistry | ENS Fork | High | Battle-tested |
| BaseRegistrar | ENS Fork | High | ERC-721 standard |
| ETHRegistrarController | ENS Fork | High | Commit-reveal secure |
| Resolver | ENS Fork | High | Standard pattern |
| ReverseRegistrar | ENS Fork | High | Minimal changes |
| StablePriceOracle | ENS Fork | High | Simple pricing |
| PaymentForwarder | Custom | Medium | Needs review |

**Overall Assessment**: The core TNS contracts inherit the security of the well-audited ENS codebase. The custom PaymentForwarder is simple and low-risk but should be reviewed independently.

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** disclose publicly
2. Email security concerns to the project maintainers
3. Include detailed reproduction steps
4. Allow reasonable time for fixes before disclosure
