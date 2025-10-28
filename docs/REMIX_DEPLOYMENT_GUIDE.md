# TNSRegistryERC721 Deployment Guide - Remix IDE

This guide walks you through deploying the TNSRegistryERC721 contract to the Intuition testnet using Remix IDE.

---

## 📋 Prerequisites

Before you start, ensure you have:

✅ **MetaMask** browser extension installed  
✅ **TRUST tokens** on Intuition testnet (for testing)  
✅ **Native tokens** on Intuition testnet (for gas fees)  
✅ **Contract files** ready (TNSRegistryERC721.sol)

---

## 🌐 Step 1: Add Intuition Testnet to MetaMask

1. **Open MetaMask** and click the network dropdown (top left)
2. **Click "Add network"** → "Add a network manually"
3. **Enter Intuition testnet details:**

```
Network Name: Intuition Testnet
RPC URL: https://testnet.rpc.intuition.systems
Chain ID: 13579
Currency Symbol: ETH (or native token symbol)
Block Explorer: https://testnet.explorer.intuition.systems
```

4. **Click "Save"**
5. **Switch to Intuition Testnet** in MetaMask

---

## 📝 Step 2: Prepare Your Contract in Remix

### A. Open Remix IDE

1. Go to **[remix.ethereum.org](https://remix.ethereum.org)**
2. You'll see the Remix IDE interface with a file explorer on the left

### B. Create Contract Files

1. **Create a new workspace** (optional but recommended):
   - Click "Workspaces" dropdown
   - Select "Create" → name it "TNS"

2. **Create the contract file:**
   - Right-click in File Explorer → "New File"
   - Name it: `TNSRegistryERC721.sol`
   - Paste your contract code

3. **Import OpenZeppelin contracts:**
   - Remix auto-imports from npm
   - Your imports should work automatically:
     ```solidity
     import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
     import "@openzeppelin/contracts/access/Ownable.sol";
     import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
     ```

---

## ⚙️ Step 3: Compile the Contract

1. **Click the "Solidity Compiler" icon** (left sidebar - looks like "S")
2. **Select compiler version:** `0.8.30` (or match your pragma)
3. **Configuration:**
   - EVM Version: Default (Shanghai or Paris)
   - Enable optimization: 200 runs (optional, saves gas)
4. **Click "Compile TNSRegistryERC721.sol"** button
5. **Wait for green checkmark** ✓ - compilation successful!

**Troubleshooting:**
- ❌ Red errors? Check OpenZeppelin imports
- ⚠️ Yellow warnings? Usually safe to ignore

---

## 🚀 Step 4: Deploy the Contract

### A. Configure Deployment Environment

1. **Click "Deploy & Run Transactions" icon** (left sidebar - looks like Ethereum logo)
2. **Environment:** Select **"Injected Provider - MetaMask"**
3. **MetaMask popup will appear** - Click "Connect"
4. **Verify network:** Should show "Custom (13579)" for Intuition testnet
5. **Account:** Your MetaMask address should appear with balance

### B. Prepare Constructor Parameters

TNSRegistryERC721 requires **ONE parameter**:

```solidity
constructor(address trustTokenAddress)
```

**You need:**
- `trustTokenAddress` - Address of the TRUST token contract on Intuition testnet

**Example:**
```
0x1234567890123456789012345678901234567890
```
(Replace with actual TRUST token address)

### C. Deploy!

1. **Select contract:** "TNSRegistryERC721" from dropdown
2. **Enter constructor parameter:**
   - Paste the TRUST token address in the text field next to "Deploy" button
   - Format: `"0x1234..."`

3. **Gas settings:**
   - Gas Limit: 3000000 (Remix auto-calculates)
   - Usually sufficient for contract deployment

4. **Click orange "Deploy" button**

5. **MetaMask confirmation:**
   - Review transaction details
   - Check gas fee
   - Click "Confirm"

6. **Wait for confirmation:**
   - You'll see "creation of TNSRegistryERC721 pending..."
   - Typical wait: 5-15 seconds
   - Success: Contract appears under "Deployed Contracts"

---

## ✅ Step 5: Verify Deployment

### In Remix:

1. **Expand deployed contract** (click ▼)
2. **You'll see all functions:**
   - Blue buttons: Read functions (free)
   - Orange buttons: Write functions (require transaction)
3. **Test a read function:**
   - Click `name` → Should return "Trust Name Service"
   - Click `symbol` → Should return "TNS"

### On Block Explorer:

1. **Copy contract address** from Remix (under deployed contract)
2. **Go to:** `https://testnet.explorer.intuition.systems`
3. **Paste address** in search bar
4. **Verify:**
   - Contract creation transaction appears
   - Contract code tab shows bytecode
   - Balance shows 0 (expected)

---

## 🔗 Step 6: Link Whitelist Manager (Optional)

If you've deployed TNSWhitelistManager separately:

1. **In Remix, expand TNSRegistryERC721**
2. **Find `setWhitelistManager` function** (orange button)
3. **Enter whitelist manager address:**
   ```
   0xYourWhitelistManagerAddress
   ```
4. **Click "transact"**
5. **Confirm in MetaMask**
6. **Verify:** Call `whitelistManager()` - should return the address

---

## 📊 Step 7: Initial Configuration

### Set Up Admin Functions (as owner):

1. **Verify ownership:**
   - Call `owner()` → Should return your address

2. **Configure resolver (if needed):**
   - Not set initially - users can set per-domain

---

## 🔧 Common Constructor Parameters

### Typical Setup:

```solidity
// Deploy TNSRegistryERC721
trustTokenAddress: "0x..." // TRUST token on Intuition testnet
```

### If Deploying Full System:

1. **First:** Deploy TRUST token (if not exists)
2. **Second:** Deploy TNSWhitelistManager
3. **Third:** Deploy TNSRegistryERC721 (with TRUST token address)
4. **Fourth:** Deploy TNSResolver (with Registry address)
5. **Fifth:** Deploy TNSPaymentForwarder (with Registry address)
6. **Finally:** Link whitelist to registry via `setWhitelistManager()`

---

## 🐛 Troubleshooting

### "Transaction Failed"
- ✅ Check you have enough native tokens for gas
- ✅ Verify you're on Intuition testnet (Chain ID: 13579)
- ✅ Ensure TRUST token address is correct
- ✅ Try increasing gas limit

### "Invalid Address"
- ✅ Address must be 42 characters (0x + 40 hex)
- ✅ Include quotes if required: `"0x123..."`
- ✅ Verify address is checksummed (MetaMask does this)

### "Compilation Error"
- ✅ Ensure compiler version is 0.8.30 or compatible
- ✅ Check OpenZeppelin imports are working
- ✅ Click "Compile" button explicitly

### "MetaMask Not Connecting"
- ✅ Refresh Remix page
- ✅ Disconnect and reconnect in MetaMask settings
- ✅ Try "WalletConnect" as alternative environment

---

## 📝 Save These Details!

After successful deployment, **save this information:**

```
Contract: TNSRegistryERC721
Address: 0x...
Network: Intuition Testnet (13579)
Deployed: [Date/Time]
Owner: [Your Address]
TRUST Token: 0x...
Whitelist Manager: 0x... (if linked)
```

---

## 🎯 Next Steps

After deployment:

1. ✅ **Deploy TNSWhitelistManager** (if using whitelist)
2. ✅ **Link whitelist** via `setWhitelistManager()`
3. ✅ **Deploy TNSResolver** with this registry address
4. ✅ **Deploy TNSPaymentForwarder** with this registry address
5. ✅ **Test domain registration** via your frontend
6. ✅ **Add whitelisted addresses** for free mints

---

## 📚 Additional Resources

- **Remix Docs:** [remix-ide.readthedocs.io](https://remix-ide.readthedocs.io)
- **Intuition Explorer:** [testnet.explorer.intuition.systems](https://testnet.explorer.intuition.systems)
- **OpenZeppelin Docs:** [docs.openzeppelin.com](https://docs.openzeppelin.com)
- **TNS Whitelist Guide:** `docs/WHITELIST_SYSTEM.md`

---

## 🔒 Security Notes

⚠️ **Important:**
- Deploy to **testnet first** - test thoroughly
- **Save contract addresses** immediately after deployment
- **Verify contract** on block explorer for transparency
- **Test all functions** before announcing to users
- **Owner key security** - this controls admin functions

---

## ✨ Success!

Your TNSRegistryERC721 contract is now deployed! 🎉

The contract is ready to:
- ✅ Register .trust domains
- ✅ Mint ERC-721 NFTs for domains
- ✅ Support whitelist integration (5+ chars free)
- ✅ Handle renewals and transfers
- ✅ Manage per-domain resolvers

**Happy deploying!** 🚀
