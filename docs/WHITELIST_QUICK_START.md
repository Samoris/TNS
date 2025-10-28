# Whitelist System - Quick Start Guide

## 🚀 **5-Minute Setup**

### **Step 1: Deploy Whitelist Contract** (2 minutes)

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create new file: `TNSWhitelistManager.sol`
3. Copy contract from `contracts/TNSWhitelistManager.sol`
4. Compile with Solidity 0.8.30
5. Deploy to Intuition testnet
6. **Save the deployed address** (e.g., `0x123...`)

### **Step 2: Link Contracts** (1 minute)

On the **Whitelist Contract**:
```solidity
// Call setRegistryContract()
// Parameter: 0xdfe1aB8532925de628C419B65B41f23997c34B4a (current registry)
```

On the **Registry Contract** (your current contract):
```solidity
// Call setWhitelistManager()
// Parameter: YOUR_WHITELIST_ADDRESS from Step 1
```

### **Step 3: Update Frontend** (1 minute)

Edit `client/src/lib/contracts.ts`:

```typescript
// Add at the top
export const WHITELIST_MANAGER_ADDRESS = "0xYourWhitelistAddress";

// Import the ABI
import WHITELIST_ABI from '../../../contracts/TNSWhitelistManager-ABI.json';
export const WHITELIST_MANAGER_ABI = WHITELIST_ABI;
```

### **Step 4: Add First Whitelist Entry** (1 minute)

Using Remix or admin panel:

```solidity
// Call addToWhitelist()
// user: 0xUserAddress
// freeMintsAllowed: 5
```

## ✅ **Done!**

Now whitelisted users can register **5+ character domains** for FREE automatically!

### 💰 Pricing with Whitelist

| Domain Length | Normal Price | Whitelisted Price |
|---------------|--------------|-------------------|
| 3 characters  | 100 TRUST/year | 100 TRUST (no discount) |
| 4 characters  | 70 TRUST/year | 70 TRUST (no discount) |
| 5+ characters | 30 TRUST/year | **FREE** ✅ |

**Note**: Premium 3-4 character domains still require payment, even for whitelisted users.

---

## 📋 **Contract Addresses**

Keep track of your deployed contracts:

```
Current Registry:     0xdfe1aB8532925de628C419B65B41f23997c34B4a
Whitelist Manager:    0x_________________ (deploy and fill in)
Resolver:             0x_________________ (if using)
Payment Forwarder:    0x_________________ (if using)
```

---

## 🧪 **Test the Integration**

### Test Whitelist Status
```solidity
// Call getWhitelistInfo(userAddress)
// Should return: (true, 5, 0, 5)
```

### Test Free Registration
1. User makes commitment
2. Wait 60 seconds
3. User calls register() with **any payment amount**
4. ✅ Payment is refunded
5. ✅ Domain is minted for free
6. ✅ Free mint quota decreases

### Verify
```solidity
// Call getWhitelistInfo(userAddress) again
// Should return: (true, 5, 1, 4)
```

---

## 🔧 **Admin Operations**

### Add Multiple Users

```solidity
// Call addToWhitelistBatch()
users[] = [0xUser1, 0xUser2, 0xUser3]
freeMintsAllowed[] = [5, 10, 3]
```

### Update Quota

```solidity
// Call updateWhitelistAllowance()
user = 0xUserAddress
newAllowance = 10
```

### Remove User

```solidity
// Call removeFromWhitelist()
user = 0xUserAddress
```

---

## 💡 **Common Use Cases**

### Early Adopter Campaign
```solidity
// Grant 1 free domain to 100 early adopters
addToWhitelistBatch(earlyAdopters, [1,1,1,...])
```

### VIP Access
```solidity
// Grant unlimited mints to VIP
addToWhitelist(vipAddress, 999)
```

### Partner Integration
```solidity
// Grant 5 free domains to partner users
addToWhitelist(partnerAddress, 5)
```

---

## 🐛 **Troubleshooting**

### "Only registry can call"
- Whitelist contract not linked to registry
- Solution: Call `setRegistryContract()` on whitelist

### "User not whitelisted"
- Address not added to whitelist
- Solution: Call `addToWhitelist()` with user address

### "No free mints remaining"
- User exhausted their quota
- Solution: Call `updateWhitelistAllowance()` to increase

### Still charging for registration
- Registry not linked to whitelist
- Solution: Call `setWhitelistManager()` on registry

---

## 📊 **Monitor Usage**

### Check Events

```javascript
// Listen for FreeMintUsed events
whitelistManager.on('FreeMintUsed', (user, domain, remaining) => {
  console.log(`${user} registered ${domain}, ${remaining} mints left`);
});
```

### Query Whitelist

```javascript
const info = await whitelistManager.getWhitelistInfo(userAddress);
console.log('Whitelisted:', info.isWhitelisted);
console.log('Total allowed:', info.freeMintsAllowed);
console.log('Used:', info.freeMintsUsed);
console.log('Remaining:', info.freeMintsRemaining);
```

---

## 🔐 **Security Notes**

- ✅ Only contract owner can manage whitelist
- ✅ Only registry can consume free mints
- ✅ Registry address can only be set once
- ✅ All operations are atomic and revert on failure
- ✅ Reentrancy protection on registry

---

## 📚 **Full Documentation**

For complete details, see:
- [Full Whitelist Documentation](./WHITELIST_SYSTEM.md)
- [Contract Source](../contracts/TNSWhitelistManager.sol)
- [Registry Integration](../contracts/TNSRegistryERC721.sol)

---

## ✨ **You're Ready!**

Your whitelist system is now live and ready to grant free domain mints!
