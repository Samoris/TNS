# 🚀 Quick Deploy - TNSRegistryERC721 on Remix

## ⚡ Fast Track Deployment (5 Minutes)

### 1️⃣ Setup MetaMask
```
Network: Intuition Testnet
RPC: https://testnet.rpc.intuition.systems
Chain ID: 13579
Explorer: https://testnet.explorer.intuition.systems
```

### 2️⃣ Open Remix
→ [remix.ethereum.org](https://remix.ethereum.org)

### 3️⃣ Load Contract
- Create new file: `TNSRegistryERC721.sol`
- Copy/paste your contract code
- Imports work automatically

### 4️⃣ Compile
- Click "Solidity Compiler" (left sidebar)
- Version: `0.8.30`
- Click "Compile TNSRegistryERC721.sol"
- ✅ Green checkmark = success

### 5️⃣ Deploy
- Click "Deploy & Run" (left sidebar)
- Environment: **"Injected Provider - MetaMask"**
- Connect MetaMask
- Contract: `TNSRegistryERC721`
- Constructor param: TRUST token address
  ```
  Example: "0x1234567890123456789012345678901234567890"
  ```
- Click **"Deploy"** → Confirm in MetaMask
- Wait ~10 seconds

### 6️⃣ Verify
- Contract appears under "Deployed Contracts"
- Copy address → Save it!
- Test: Click `name` → Should return "Trust Name Service"

---

## 🎯 Constructor Parameter

**You need 1 parameter:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `trustTokenAddress` | TRUST token contract address on Intuition testnet | `0x1234...` |

---

## 🔧 After Deployment

### Optional: Link Whitelist Manager
```solidity
// If you deployed TNSWhitelistManager separately
setWhitelistManager("0xWhitelistManagerAddress")
```

### Verify on Explorer
1. Copy contract address
2. Go to: `https://testnet.explorer.intuition.systems`
3. Paste address
4. See your deployed contract!

---

## 📋 Full Deployment Order

If deploying the entire TNS system:

```
1. TNSWhitelistManager (no constructor params)
2. TNSRegistryERC721 (trustTokenAddress)
3. setWhitelistManager() on Registry
4. TNSResolver (registryAddress)
5. TNSPaymentForwarder (registryAddress)
```

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| Transaction fails | Check gas balance & network |
| MetaMask won't connect | Refresh page, reconnect wallet |
| Compilation error | Verify Solidity version 0.8.30 |
| Invalid address | Ensure 42-char hex (0x...) |

---

## ✅ Success Checklist

- [ ] MetaMask on Intuition testnet
- [ ] Contract compiled (green ✓)
- [ ] Deployed successfully
- [ ] Contract address saved
- [ ] Tested `name()` function
- [ ] Address on block explorer

---

## 📝 Save This Info

```
Registry Address: 0x___________________
TRUST Token: 0x___________________
Network: Intuition Testnet (13579)
Deployed: [Date]
Owner: [Your Address]
```

---

**🎉 Done! Your TNS Registry is live!**

Next: Deploy TNSResolver & TNSPaymentForwarder with this registry address.
