# Trust Name Service (TNS) 2-Step Commit-Reveal Registration Flow

## Overview

The TNS domain registration system implements a secure 2-step commit-reveal mechanism to prevent front-running attacks. This ensures fair domain registration where malicious actors cannot steal domain names by observing pending transactions in the mempool.

## How It Works

### Step 1: Make Commitment (Commit Phase)

1. **User Action**: Click "Step 1: Make Commitment" button
2. **Frontend Process**:
   - Generates a random secret (32-byte hex string)
   - Creates commitment hash using: `keccak256(abi.encodePacked(name, msg.sender, secret))`
   - Stores commitment data locally: secret, hash, transaction hash, timestamp
3. **Smart Contract**: Records the commitment hash and timestamp on-chain
4. **Wait Period**: 60-second minimum wait enforced before Step 2
5. **UI Feedback**: Countdown timer shows remaining wait time

### Step 2: Complete Registration (Reveal Phase)

1. **User Action**: Click "Step 2: Complete Registration & Mint NFT" (enabled after 60 seconds)
2. **Frontend Process**:
   - Retrieves stored secret from Step 1
   - Calls register() with: name, duration, and the secret
3. **Smart Contract**:
   - Verifies commitment exists and is within 24-hour window
   - Validates commitment: `stored_hash == keccak256(abi.encodePacked(name, msg.sender, secret))`
   - Mints ERC-721 NFT to user's address
   - Records domain registration details
4. **Success**: User receives NFT representing domain ownership

## Security Features

### Front-Running Prevention
- **Problem**: Attacker observes pending registration tx and submits higher gas tx to steal domain
- **Solution**: Commitment hash hides the domain name, making it impossible for attackers to know which domain is being registered

### Timing Constraints
- **Minimum Wait**: 60 seconds between commit and reveal
  - Ensures commitment is confirmed on-chain before reveal
  - Prevents instant registration that could be front-run
- **Maximum Window**: 24 hours to complete registration after commitment
  - Prevents indefinite holding of commitments
  - Frees up domains if user abandons registration

### Reentrancy Protection
- All state-changing functions use ReentrancyGuard
- Prevents recursive calls during registration or withdrawal

### Integer Overflow Protection
- Safe math operations in duration calculations
- Explicit checks for overflow in renewal functions

## User Experience Flow

### Visual States

1. **Before Commitment**
   - Shows Step 1 button: "Make Commitment"
   - Info alert explains 2-step process
   - Domain details displayed

2. **After Commitment (Waiting)**
   - Commitment status card with checkmark
   - Progress bar showing wait time
   - Countdown: "Time remaining: X seconds"
   - Step 2 button disabled with timer

3. **Ready to Register**
   - Commitment status: "✓ Ready to register!"
   - Step 2 button enabled: "Complete Registration & Mint NFT"
   - Green success indicator

4. **Registration Complete**
   - Success card with NFT details
   - Token ID and expiration displayed
   - Links to view transaction and contract

### Error Handling

**Commitment Errors**:
- Wallet not connected → Prompt to connect
- Wrong network → Prompt to switch
- Transaction failed → Show error toast with details

**Registration Errors**:
- Attempted too early → "Please wait X more seconds"
- Commitment expired (>24h) → "Commitment expired, start over"
- Transaction failed → Show error toast

## Technical Implementation

### Frontend State Management

```typescript
interface CommitmentData {
  secret: string;           // 32-byte hex secret
  commitmentHash: string;   // keccak256 hash of commitment
  commitmentTx: string;     // Transaction hash of commitment
  commitmentTime: number;   // Timestamp (ms) when committed
}
```

### Web3 Service Methods

```typescript
// Generate random secret
generateSecret(): string

// Create commitment hash
createCommitmentHash(name: string, owner: string, secret: string): string

// Submit commitment to blockchain
makeCommitment(contractAddress: string, abi: any, commitmentHash: string): Promise<string>

// Register domain with secret
registerDomain(address: string, abi: any, name: string, years: number, cost: string, secret: string): Promise<string>
```

### Smart Contract Functions

```solidity
// Step 1: Record commitment
function makeCommitment(bytes32 commitment) external nonReentrant

// Step 2: Register with secret
function register(string calldata name, address owner, uint256 duration, bytes32 secret) 
    external payable nonReentrant

// Internal verification
function _verifyCommitment(string calldata name, address owner, bytes32 secret) 
    internal view returns (bool)
```

## Best Practices

### For Users
1. **Don't close browser** during wait period (local secret storage)
2. **Complete within 24 hours** after commitment
3. **Have sufficient TRUST** tokens for registration
4. **Wait for Step 1 confirmation** before starting Step 2

### For Developers
1. **Always pass secret** to register() function
2. **Store commitment data** securely in component state
3. **Clear commitment data** after successful registration
4. **Handle timer cleanup** in useEffect return function
5. **Show clear visual feedback** for each step

## Testing Checklist

- [ ] Commitment transaction succeeds and records hash
- [ ] Timer starts at 60 seconds and counts down
- [ ] Registration button disabled during wait period
- [ ] Registration succeeds after 60 seconds with correct secret
- [ ] Registration fails if attempted too early
- [ ] Registration fails with wrong secret
- [ ] Commitment expires after 24 hours
- [ ] NFT minted successfully to user's wallet
- [ ] UI resets properly for new registration
- [ ] Error messages clear and actionable

## Resources

- **Contract**: `contracts/TNSRegistryERC721.sol`
- **Security Docs**: `contracts/SECURITY_IMPROVEMENTS.md`
- **ABI**: `contracts/TNSRegistryERC721-ABI.json`
- **Web3 Service**: `client/src/lib/web3.ts`
- **Registration UI**: `client/src/pages/register.tsx`
