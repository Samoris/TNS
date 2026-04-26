# @tns/sdk

JavaScript / TypeScript SDK for integrating **Trust Name Service** (TNS) into your application.

TNS is an ENS-forked naming service on [Intuition mainnet](https://intuition.systems) — register human-readable `.trust` names that resolve to blockchain addresses.

---

## Installation

```bash
npm install @tns/sdk ethers
# or
yarn add @tns/sdk ethers
```

`ethers` (v6) is a required peer dependency.

---

## Quick Start

### Drop-in ethers Provider (ENS-style)

The cleanest way — works **exactly** like ENS does in ethers. Use a `TNSProvider` and `.trust` names just work everywhere ethers expects an address.

```ts
import { TNSProvider } from "@tns/sdk";
import { parseEther, Wallet } from "ethers";

const provider = new TNSProvider();

// Same API as ethers — like ENS for .eth names:
await provider.resolveName("alice.trust");      // → "0x1234…"
await provider.lookupAddress("0xabc…");         // → "alice.trust"

// Even better — use names directly in transactions:
const wallet = new Wallet(PRIVATE_KEY, provider);
await wallet.sendTransaction({
  to: "alice.trust",                            // ← name resolved automatically
  value: parseEther("1"),
});
```

### MetaMask / window.ethereum

```ts
import { tnsBrowserProvider } from "@tns/sdk";

const provider = tnsBrowserProvider(window.ethereum);
const addr = await provider.resolveName("alice.trust");   // ← works the same
```

### Wrap an existing provider

```ts
import { BrowserProvider } from "ethers";
import { withTNS } from "@tns/sdk";

const provider = withTNS(new BrowserProvider(window.ethereum));
await provider.resolveName("alice.trust");
```

---

## Standalone Client API

If you don't want to swap your provider, use `TNSClient` directly.

### Smart resolve (recommended)

Accepts **either** a `.trust` name OR an address — auto-detects and returns an address. Use this for any input field where a user types a recipient.

```ts
import { TNSClient } from "@tns/sdk";

const tns = new TNSClient();

await tns.resolveName("alice.trust");   // → "0x1234…"
await tns.resolveName("alice");         // → "0x1234…"
await tns.resolveName("0xAbC…");        // → "0xAbC…" (returned as-is, checksummed)
```

### Smart display name

Accepts an address or name and returns the best human-readable label — primary `.trust` name if set, otherwise a shortened address.

```ts
await tns.displayName("0x1234…");       // → "alice.trust" (if primary set)
                                        // → "0x1234…abcd" (if not set)
await tns.displayName("alice.trust");   // → "alice.trust"
```

### Detect input type

```ts
tns.identify("alice.trust");  // → "name"
tns.identify("0xAbC…");       // → "address"
tns.identify("???");          // → "unknown"
```

### Resolve a name → address (name only)

```ts
const address = await tns.resolve("alice.trust");
console.log(address); // "0x1234..."
```

### Reverse-resolve address → name (address only)

```ts
const name = await tns.lookupAddress("0x1234...");
console.log(name); // "alice.trust"
```

### Check availability

```ts
const available = await tns.isAvailable("myname");
console.log(available); // true / false
```

### Get price

```ts
const { priceFormatted, currency } = await tns.getPrice("myname");
console.log(`${priceFormatted} ${currency} / year`); // "30 TRUST / year"
```

### Get full domain info

```ts
const info = await tns.getDomainInfo("alice.trust");
// {
//   name: "alice.trust",
//   owner: "0x...",
//   address: "0x...",
//   expiry: Date,
//   isAvailable: false,
//   isExpired: false,
//   avatar: "ipfs://...",
//   textRecords: { url: "https://..." },
//   contentHash: null
// }
```

### Read a text record

```ts
const avatar = await tns.getTextRecord("alice.trust", "avatar");
const url    = await tns.getTextRecord("alice.trust", "url");
const email  = await tns.getTextRecord("alice.trust", "email");
```

---

## React Integration

Import from `@tns/sdk/react`. React 18+ is a peer dependency.

### Hooks

```tsx
import {
  useTNSResolveName,    // smart: name OR address → address
  useTNSDisplayName,    // smart: address OR name → display label
  useTNSResolve,        // name → address only
  useTNSLookup,         // address → name only
  useTNSAvailability,
  useTNSDomainInfo,
} from "@tns/sdk/react";

// Smart resolve — works for ANY user input (name or address)
function RecipientField() {
  const [input, setInput] = useState("");
  const { address, loading } = useTNSResolveName(input);
  return (
    <>
      <input value={input} onChange={(e) => setInput(e.target.value)}
             placeholder="alice.trust or 0x…" />
      {loading ? "Resolving…" : address && <span>→ {address}</span>}
    </>
  );
}

// Smart display name — show .trust name if set, else shortened address
function UserBadge({ identity }: { identity: string }) {
  const { displayName } = useTNSDisplayName(identity);
  return <span>{displayName}</span>;
}

// Resolve name → address
function AddressDisplay({ name }: { name: string }) {
  const { address, loading } = useTNSResolve(name);
  if (loading) return <span>Resolving…</span>;
  return <span>{address ?? "Not registered"}</span>;
}

// Reverse-lookup: address → name
function NameDisplay({ address }: { address: string }) {
  const { name, loading } = useTNSLookup(address);
  return <span>{loading ? "…" : (name ?? address)}</span>;
}

// Check availability + price
function AvailabilityBadge({ name }: { name: string }) {
  const { available, price, loading } = useTNSAvailability(name);
  if (loading) return <span>Checking…</span>;
  return (
    <div>
      <span>{available ? "✅ Available" : "❌ Taken"}</span>
      {price && <span>{price.priceFormatted} {price.currency}/yr</span>}
    </div>
  );
}

// Full domain info
function DomainCard({ name }: { name: string }) {
  const { info, loading } = useTNSDomainInfo(name);
  if (loading) return <div>Loading…</div>;
  if (!info) return null;
  return (
    <div>
      <h2>{info.name}</h2>
      <p>Owner: {info.owner}</p>
      <p>Address: {info.address}</p>
      <p>Expires: {info.expiry?.toLocaleDateString()}</p>
    </div>
  );
}
```

### TNSNamePicker — ready-to-use search + select UI

Drop into your app to let users pick a `.trust` name:

```tsx
import { TNSNamePicker } from "@tns/sdk/react";

function RegisterPage() {
  const handleSelect = (name: string, address: string | null) => {
    console.log("Selected:", name, "resolves to:", address);
    // continue with registration flow…
  };

  return (
    <TNSNamePicker
      onSelect={handleSelect}
      placeholder="Search .trust names…"
    />
  );
}
```

#### TNSNamePicker props

| Prop | Type | Description |
|------|------|-------------|
| `onSelect` | `(name, address) => void` | Called when user clicks "Select" on an available name |
| `placeholder` | `string` | Input placeholder text |
| `defaultValue` | `string` | Pre-filled name |
| `client` | `TNSClient` | Custom client instance (optional) |
| `className` | `string` | CSS class for the root element |

---

## Custom Configuration

Point the SDK at a custom RPC or contract addresses:

```ts
import { TNSClient } from "@tns/sdk";

const tns = new TNSClient({
  rpcUrl: "https://your-rpc-endpoint",
  contracts: {
    registry: "0x...",
    resolver: "0x...",
  },
});
```

---

## Utility Functions

```ts
import { namehash, labelhash, normalise, toFullName } from "@tns/sdk";

namehash("alice.trust");     // bytes32 node hash
labelhash("alice");          // keccak256 of label
normalise("ALICE.trust");    // "alice.trust"
toFullName("alice");         // "alice.trust"
```

---

## Contract Addresses (Intuition Mainnet, V3)

```ts
import { CONTRACT_ADDRESSES, INTUITION_NETWORK } from "@tns/sdk";

// CONTRACT_ADDRESSES.registry    — TNSRegistry
// CONTRACT_ADDRESSES.baseRegistrar — BaseRegistrarImplementation (ERC-721)
// CONTRACT_ADDRESSES.controller  — ETHRegistrarController
// CONTRACT_ADDRESSES.resolver    — Resolver
// CONTRACT_ADDRESSES.reverseRegistrar — ReverseRegistrar
// CONTRACT_ADDRESSES.priceOracle
// CONTRACT_ADDRESSES.paymentForwarder

// INTUITION_NETWORK.chainId      — 1155
// INTUITION_NETWORK.rpcUrl       — https://intuition.calderachain.xyz
// INTUITION_NETWORK.currency     — "TRUST"
// INTUITION_NETWORK.explorerUrl  — https://explorer.intuition.systems
```

---

## ABIs

All contract ABIs are exported for use with any ethers/viem instance:

```ts
import {
  TNS_REGISTRY_ABI,
  TNS_RESOLVER_ABI,
  TNS_CONTROLLER_ABI,
  TNS_BASE_REGISTRAR_ABI,
  TNS_REVERSE_REGISTRAR_ABI,
} from "@tns/sdk";
```

---

## Pricing Reference

| Name length | Price |
|-------------|-------|
| 3 characters | 100 TRUST / year |
| 4 characters | 70 TRUST / year |
| 5+ characters | 30 TRUST / year |

---

## Network

| Property | Value |
|----------|-------|
| Chain ID | 1155 |
| RPC | `https://intuition.calderachain.xyz` |
| Currency | TRUST (native) |
| Explorer | `https://explorer.intuition.systems` |

---

## License

MIT
