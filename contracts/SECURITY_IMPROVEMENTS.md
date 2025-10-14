# Security Improvements to TNSRegistryERC721

This document outlines the security enhancements implemented in the TNSRegistryERC721 smart contract.

## 🛡️ Security Features Added

### 1. Reentrancy Protection
**Issue Fixed**: Reentrancy attacks on `withdraw()` and payment functions
**Solution**: 
- Imported OpenZeppelin's `ReentrancyGuard`
- Added `nonReentrant` modifier to:
  - `withdraw()` - Prevents reentrancy during fund withdrawal
  - `register()` - Protects registration with refunds
  - `renew()` - Protects renewal with refunds

**Impact**: Contract is now protected against reentrancy attacks where malicious contracts could drain funds.

---

### 2. Front-Running Protection
**Issue Fixed**: Front-runners could see pending transactions and register domains before legitimate users
**Solution**: Implemented a **commit-reveal scheme**

#### How it works:
1. **Step 1 - Commit**: User calls `makeCommitment(bytes32 commitment)` where:
   - `commitment = keccak256(abi.encodePacked(domain, msg.sender, secret))`
   - Commitment is stored with timestamp

2. **Step 2 - Register**: User calls `register(domain, duration, secret)` where:
   - Must wait at least `MIN_COMMITMENT_AGE` (1 minute) after commitment
   - Must register within `MAX_COMMITMENT_AGE` (24 hours)
   - Commitment is verified and then deleted
   
3. **Rate Limiting**: Users must wait at least 2 blocks between registrations

**Impact**: 
- Front-runners cannot see which domain is being registered during the commitment phase
- Users must wait 1 minute minimum, preventing instant front-running
- Rate limiting prevents spam attacks

---

### 3. Integer Overflow Protection in `renew()`
**Issue Fixed**: Potential overflow when adding years to expiration time
**Solution**: Explicit overflow check before addition

```solidity
// Check for overflow before adding
require(
    currentExpiration <= type(uint256).max - extensionTime,
    "Expiration time overflow"
);
```

**Impact**: Prevents domains from having incorrect expiration times due to overflow, even though Solidity 0.8+ has built-in checks.

---

### 4. Restricted `receive()` Function
**Issue Fixed**: Users accidentally sending ETH directly to contract, causing locked funds
**Solution**: Changed `receive()` to revert with helpful error message

```solidity
receive() external payable {
    revert("Direct payments not accepted. Use register() or renew()");
}
```

**Impact**: 
- Prevents accidental fund loss
- Guides users to proper contract interaction
- Funds can only enter through intended functions

---

## 🔧 Additional Improvements

### Better Payment Handling
- Replaced `.transfer()` with `.call{value: }("")` for refunds
- More compatible with different wallet implementations
- Explicitly checks for success

### Enhanced Error Messages
- Clear, descriptive error messages for all require statements
- Helps users understand what went wrong

---

## 📋 New Contract Functions

### `makeCommitment(bytes32 commitment)`
Creates a commitment for domain registration (front-running protection)

**Parameters**:
- `commitment`: Hash of `keccak256(abi.encodePacked(domain, msg.sender, secret))`

**Usage Example**:
```javascript
const secret = ethers.randomBytes(32);
const commitment = ethers.keccak256(
  ethers.solidityPacked(
    ["string", "address", "bytes32"],
    [domainName, userAddress, secret]
  )
);
await contract.makeCommitment(commitment);
// Wait at least 1 minute
await contract.register(domainName, duration, secret, { value: cost });
```

---

## 🔒 Security Constants

- `MIN_COMMITMENT_AGE`: 1 minute (prevents immediate front-running)
- `MAX_COMMITMENT_AGE`: 24 hours (prevents stale commitments)
- `MIN_REGISTRATION_INTERVAL`: 2 blocks (rate limiting)

---

## ⚠️ Breaking Changes

### `register()` Function Signature Changed
**Old**: `register(string domain, uint256 duration)`
**New**: `register(string domain, uint256 duration, bytes32 secret)`

**Migration Required**: Frontend code must be updated to:
1. Generate a random secret
2. Call `makeCommitment()` first
3. Wait at least 1 minute
4. Call `register()` with the secret

---

## ✅ Security Checklist

- [x] Reentrancy protection on all payable functions
- [x] Front-running protection for domain registration
- [x] Integer overflow protection
- [x] Restricted direct payments
- [x] Rate limiting
- [x] Proper error handling
- [x] Gas-efficient refunds using `.call()`
- [x] OpenZeppelin battle-tested contracts

---

## 🚀 Deployment Notes

When deploying this contract:
1. Ensure OpenZeppelin contracts are properly installed
2. Test the commit-reveal flow thoroughly
3. Verify all security features work as expected
4. Update frontend to support new registration flow
5. Communicate changes to users about the 2-step registration process
