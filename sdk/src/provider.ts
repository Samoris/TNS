import {
  JsonRpcProvider,
  BrowserProvider,
  type Eip1193Provider,
  type Networkish,
  type JsonRpcApiProviderOptions,
  type Provider,
} from "ethers";
import { TNSClient } from "./client";
import { CONTRACT_ADDRESSES, INTUITION_NETWORK } from "./constants";

export interface TNSProviderOptions {
  contracts?: Partial<typeof CONTRACT_ADDRESSES>;
}

/**
 * A drop-in `JsonRpcProvider` with built-in `.trust` name resolution.
 *
 * Works exactly like ENS support in ethers — once constructed, you can call
 * `provider.resolveName("alice.trust")` and `provider.lookupAddress(addr)`
 * just like with `.eth` names on Ethereum mainnet.
 *
 * @example
 * import { TNSProvider } from "@samoris/tns-sdk";
 *
 * const provider = new TNSProvider();
 * const address = await provider.resolveName("alice.trust");
 * const name    = await provider.lookupAddress("0xabc…");
 *
 * // Use it for transactions exactly like a normal ethers provider:
 * const tx = await wallet.connect(provider).sendTransaction({
 *   to: "alice.trust",   // ← name, resolved automatically
 *   value: parseEther("1"),
 * });
 */
export class TNSProvider extends JsonRpcProvider {
  private tns: TNSClient;

  constructor(
    url?: string,
    network?: Networkish,
    options?: JsonRpcApiProviderOptions & TNSProviderOptions
  ) {
    super(url ?? INTUITION_NETWORK.rpcUrl, network, options);
    this.tns = new TNSClient({ provider: this, contracts: options?.contracts });
  }

  /**
   * Resolve a name to an address. Handles `.trust` names natively;
   * falls back to the default ENS lookup for everything else.
   */
  async resolveName(name: string): Promise<string | null> {
    if (looksLikeTrustName(name)) {
      return this.tns.resolve(name);
    }
    return super.resolveName(name);
  }

  /**
   * Reverse-resolve an address to its primary `.trust` name.
   */
  async lookupAddress(address: string): Promise<string | null> {
    return this.tns.lookupAddress(address);
  }

  /** Direct access to the underlying TNSClient for richer queries. */
  get client(): TNSClient {
    return this.tns;
  }
}

/**
 * Wrap an existing `BrowserProvider` (e.g. MetaMask) so it understands
 * `.trust` names. The original provider is mutated — its `resolveName` and
 * `lookupAddress` methods are replaced.
 *
 * @example
 * import { BrowserProvider } from "ethers";
 * import { withTNS } from "@samoris/tns-sdk";
 *
 * const provider = withTNS(new BrowserProvider(window.ethereum));
 * const addr = await provider.resolveName("alice.trust");
 */
export function withTNS<P extends Provider>(
  provider: P,
  options: TNSProviderOptions = {}
): P {
  const tns = new TNSClient({ provider, contracts: options.contracts });
  const original = {
    resolveName: provider.resolveName?.bind(provider),
    lookupAddress: provider.lookupAddress?.bind(provider),
  };

  (provider as any).resolveName = async (name: string) => {
    if (looksLikeTrustName(name)) {
      return tns.resolve(name);
    }
    return original.resolveName ? original.resolveName(name) : null;
  };

  (provider as any).lookupAddress = async (address: string) => {
    return tns.lookupAddress(address);
  };

  return provider;
}

/**
 * Convenience wrapper for `BrowserProvider` (e.g. `window.ethereum`).
 * Returns a TNS-aware browser provider.
 */
export function tnsBrowserProvider(
  ethereum: Eip1193Provider,
  options: TNSProviderOptions = {}
): BrowserProvider {
  const provider = new BrowserProvider(ethereum);
  return withTNS(provider, options);
}

function looksLikeTrustName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim().toLowerCase();
  if (trimmed.endsWith(".trust")) return true;
  // Bare label with no dots → assume .trust (matches ENS-style apps that
  // accept "alice" and append ".eth").
  if (!trimmed.includes(".") && /^[a-z0-9-]+$/.test(trimmed)) return true;
  return false;
}
