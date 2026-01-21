# TNS Contracts - Remix Deployment Guide
## ENS-Forked Architecture with Native TRUST Token Payments

## Network: Intuition Mainnet
- **Chain ID**: 1155
- **RPC URL**: https://intuition.calderachain.xyz
- **Explorer**: https://explorer.intuition.systems
- **Native Token**: TRUST (used for gas and domain payments)

## Treasury Address
`0x629A5386F73283F80847154d16E359192a891f86`

---

## CONTRACT FILES (in `contracts/remix/`)

| File | Contract | Description |
|------|----------|-------------|
| 0_HashHelper.sol | HashHelper | Calculate node hashes (deploy first, use for values) |
| 1_TNSRegistry.sol | TNSRegistry | Core registry - exact ENS architecture |
| 2_TNSBaseRegistrar.sol | TNSBaseRegistrar | ERC-721 registrar - exact ENS architecture |
| 3_TNSPriceOracle.sol | TNSPriceOracle | Tiered pricing oracle |
| 4_TNSController.sol | TNSController | Registration controller - ENS ETHRegistrarController |
| 5_TNSReverseRegistrar.sol | TNSReverseRegistrar | Reverse resolution - exact ENS architecture |
| 6_TNSResolver.sol | TNSResolver | Public resolver - exact ENS architecture |
| 7_TNSPaymentForwarder.sol | TNSPaymentForwarder | Send TRUST to .trust domains |

---

## DEPLOYMENT ORDER

### Step 0: Deploy HashHelper (Optional but Recommended)
- **Contract**: HashHelper
- **Parameters**: None
- **After deploying**: Call `getBaseNode()` and save the result

### Step 1: Deploy TNSRegistry
- **Contract**: TNSRegistry
- **Parameters**: None

### Step 2: Deploy TNSBaseRegistrar
- **Contract**: TNSBaseRegistrar
- **Parameters**:
  - `_tns`: TNSRegistry address
  - `_baseNode`: Result from HashHelper.getBaseNode()

### Step 3: Deploy TNSPriceOracle
- **Contract**: TNSPriceOracle
- **Parameters**: None

### Step 4: Deploy TNSController
- **Contract**: TNSController
- **Parameters**:
  - `_base`: TNSBaseRegistrar address
  - `_prices`: TNSPriceOracle address
  - `_minCommitmentAge`: `60`
  - `_maxCommitmentAge`: `86400`
  - `_reverseRegistrar`: `0x0000000000000000000000000000000000000000` (set later)
  - `_nameWrapper`: `0x0000000000000000000000000000000000000000`
  - `_treasury`: `0x629A5386F73283F80847154d16E359192a891f86`

### Step 5: Deploy TNSReverseRegistrar
- **Contract**: TNSReverseRegistrar
- **Parameters**:
  - `_tns`: TNSRegistry address

### Step 6: Deploy TNSResolver
- **Contract**: TNSResolver
- **Parameters**:
  - `_tns`: TNSRegistry address
  - `_trustedController`: TNSController address
  - `_trustedReverseRegistrar`: TNSReverseRegistrar address

### Step 7: Deploy TNSPaymentForwarder
- **Contract**: TNSPaymentForwarder
- **Parameters**:
  - `_tns`: TNSRegistry address
  - `_resolver`: TNSResolver address
  - `_baseNode`: Same as Step 2

---

## POST-DEPLOYMENT CONFIGURATION (9 Transactions)

Execute these transactions in order after all contracts are deployed:

### Transaction 1: Create .reverse TLD
**Contract**: TNSRegistry  
**Function**: `setSubnodeOwner`
```
node: 0x0000000000000000000000000000000000000000000000000000000000000000
label: [Call HashHelper.getReverseLabel()]
owner: YOUR_DEPLOYER_ADDRESS
```

### Transaction 2: Create addr.reverse Node
**Contract**: TNSRegistry  
**Function**: `setSubnodeOwner`
```
node: [Call HashHelper.getReverseNode()]
label: [Call HashHelper.getAddrLabel()]
owner: TNSReverseRegistrar ADDRESS
```

### Transaction 3: Transfer .trust TLD to BaseRegistrar
**Contract**: TNSRegistry  
**Function**: `setSubnodeOwner`
```
node: 0x0000000000000000000000000000000000000000000000000000000000000000
label: [Call HashHelper.getTrustLabel()]
owner: TNSBaseRegistrar ADDRESS
```

### Transaction 4: Add Controller to BaseRegistrar
**Contract**: TNSBaseRegistrar  
**Function**: `addController`
```
controller: TNSController ADDRESS
```

### Transaction 5: Set Controller on ReverseRegistrar
**Contract**: TNSReverseRegistrar  
**Function**: `setController`
```
controller: TNSController ADDRESS
enabled: true
```

### Transaction 6: Set Default Resolver on ReverseRegistrar
**Contract**: TNSReverseRegistrar  
**Function**: `setDefaultResolver`
```
resolver: TNSResolver ADDRESS
```

### Transaction 7: Set BaseURI for NFT Metadata
**Contract**: TNSBaseRegistrar  
**Function**: `setBaseURI`
```
baseURI: "https://tns.intuition.box/api/metadata/"
```

### Transaction 8: Set Resolver for .trust TLD
**Contract**: TNSBaseRegistrar  
**Function**: `setResolver`
```
resolver: TNSResolver ADDRESS
```

### Transaction 9: Update ReverseRegistrar in Controller
**Contract**: TNSController  
**Function**: `setReverseRegistrar`
```
_reverseRegistrar: TNSReverseRegistrar ADDRESS
```

---

## VERIFICATION CHECKLIST

After all transactions, verify:

1. ✅ `TNSRegistry.owner(baseNode)` returns TNSBaseRegistrar address
2. ✅ `TNSBaseRegistrar.controllers(TNSController)` returns `true`
3. ✅ `TNSController.available("testname")` returns `true`
4. ✅ `TNSController.rentPrice("test", 31536000)` returns correct pricing

---

## RECORD YOUR DEPLOYED ADDRESSES

```
HashHelper:            0x________________
TNSRegistry:           0x________________
TNSBaseRegistrar:      0x________________
TNSPriceOracle:        0x________________
TNSController:         0x________________
TNSReverseRegistrar:   0x________________
TNSResolver:           0x________________
TNSPaymentForwarder:   0x________________
```

---

## AFTER DEPLOYMENT

Update these files with the new contract addresses:
- `client/src/lib/contracts.ts` - Update NEW_CONTRACTS section
- `server/blockchain.ts` - Update contract addresses
- Set `USE_NEW_CONTRACTS = true` in both files
