import {
  JsonRpcProvider,
  Contract,
  BigNumberish,
  formatEther,
  isAddress,
  getAddress,
  type Provider,
} from "ethers";
import { namehash, labelhash, normalise, toFullName } from "./namehash";
import {
  TNS_REGISTRY_ABI,
  TNS_RESOLVER_ABI,
  TNS_CONTROLLER_ABI,
  TNS_BASE_REGISTRAR_ABI,
} from "./abis";
import { CONTRACT_ADDRESSES, INTUITION_NETWORK, ZERO_ADDRESS } from "./constants";

export interface TNSClientConfig {
  /** RPC URL (defaults to Intuition mainnet). Ignored if `provider` is supplied. */
  rpcUrl?: string;
  /** Pass an existing ethers Provider (e.g. a BrowserProvider from MetaMask). */
  provider?: Provider;
  /** Override individual contract addresses. */
  contracts?: Partial<typeof CONTRACT_ADDRESSES>;
}

export interface DomainInfo {
  name: string;
  owner: string | null;
  resolver: string | null;
  address: string | null;
  expiry: Date | null;
  isAvailable: boolean;
  isExpired: boolean;
  textRecords: Record<string, string>;
  avatar: string | null;
  contentHash: string | null;
}

export interface PriceInfo {
  price: bigint;
  priceFormatted: string;
  currency: string;
}

export class TNSClient {
  private provider: Provider;
  private addresses: typeof CONTRACT_ADDRESSES;

  constructor(config: TNSClientConfig = {}) {
    this.provider =
      config.provider ??
      new JsonRpcProvider(config.rpcUrl ?? INTUITION_NETWORK.rpcUrl);
    this.addresses = {
      ...CONTRACT_ADDRESSES,
      ...config.contracts,
    };
  }

  private registry() {
    return new Contract(this.addresses.registry, TNS_REGISTRY_ABI, this.provider);
  }

  private controller() {
    return new Contract(this.addresses.controller, TNS_CONTROLLER_ABI, this.provider);
  }

  private baseRegistrar() {
    return new Contract(this.addresses.baseRegistrar, TNS_BASE_REGISTRAR_ABI, this.provider);
  }

  private resolverAt(address: string) {
    return new Contract(address, TNS_RESOLVER_ABI, this.provider);
  }

  /**
   * Smart resolve — accepts EITHER a `.trust` name OR an address.
   * - If input is already an address (0x…), returns it normalised (checksummed).
   * - If input is a .trust name (or bare label), resolves it to an address.
   * - Returns null if a name is given but unregistered / has no address.
   *
   * This is the recommended method for apps that accept user input.
   *
   * @example
   * await tns.resolveName("alice.trust");          // → "0x1234…"
   * await tns.resolveName("alice");                // → "0x1234…"
   * await tns.resolveName("0xabc…");               // → "0xAbC…" (checksummed)
   */
  async resolveName(input: string): Promise<string | null> {
    const trimmed = (input ?? "").trim();
    if (!trimmed) return null;

    if (isAddress(trimmed)) {
      try {
        return getAddress(trimmed);
      } catch {
        return null;
      }
    }

    return this.resolve(trimmed);
  }

  /**
   * Detect what kind of input was given.
   * Returns "address", "name", or "unknown".
   */
  identify(input: string): "address" | "name" | "unknown" {
    const trimmed = (input ?? "").trim();
    if (!trimmed) return "unknown";
    if (isAddress(trimmed)) return "address";
    const label = normalise(trimmed).replace(/\.trust$/, "");
    if (/^[a-z0-9-]{1,}$/.test(label)) return "name";
    return "unknown";
  }

  /**
   * Resolve a .trust name to an address.
   * Accepts "alice", "alice.trust", etc.
   * Returns null if not registered or no address set.
   *
   * For input that may be either a name OR an address, prefer `resolveName()`.
   */
  async resolve(name: string): Promise<string | null> {
    const fullName = toFullName(normalise(name));
    const node = namehash(fullName);

    try {
      const resolverAddress: string = await this.registry().resolver(node);
      if (!resolverAddress || resolverAddress === ZERO_ADDRESS) return null;

      const resolver = this.resolverAt(resolverAddress);
      const address: string = await resolver.addr(node);
      if (!address || address === ZERO_ADDRESS) return null;

      return getAddress(address);
    } catch {
      return null;
    }
  }

  /**
   * Smart display name — accepts EITHER an address OR a `.trust` name.
   * - If input is an address with a primary `.trust` name set, returns the name.
   * - If input is a `.trust` name, returns it normalised.
   * - Otherwise returns a shortened address (e.g. "0x1234…abcd").
   *
   * Useful for displaying user-facing identifiers in UI.
   *
   * @example
   * await tns.displayName("0x1234…");        // → "alice.trust" (if set), else "0x1234…abcd"
   * await tns.displayName("alice.trust");    // → "alice.trust"
   */
  async displayName(input: string): Promise<string> {
    const trimmed = (input ?? "").trim();
    if (!trimmed) return "";

    if (isAddress(trimmed)) {
      const name = await this.lookupAddress(trimmed);
      if (name) return name;
      return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
    }

    return toFullName(normalise(trimmed));
  }

  /**
   * Reverse-resolve an address to a primary .trust name.
   * Returns null if no primary name is set.
   */
  async lookupAddress(address: string): Promise<string | null> {
    const reverseNode = namehash(`${address.toLowerCase().slice(2)}.addr.reverse`);

    try {
      const resolverAddress: string = await this.registry().resolver(reverseNode);
      if (!resolverAddress || resolverAddress === ZERO_ADDRESS) return null;

      const resolver = this.resolverAt(resolverAddress);
      const name: string = await resolver.name(reverseNode);
      if (!name) return null;

      const forwardAddress = await this.resolve(name);
      if (forwardAddress?.toLowerCase() !== address.toLowerCase()) return null;

      return name;
    } catch {
      return null;
    }
  }

  /**
   * Check whether a name is available for registration.
   */
  async isAvailable(name: string): Promise<boolean> {
    const label = normalise(name).replace(/\.trust$/, "");
    if (label.length < 3) return false;

    try {
      const available: boolean = await this.controller().available(label);
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Get the expiry date of a registered name.
   * Returns null if not registered.
   */
  async getExpiry(name: string): Promise<Date | null> {
    const label = normalise(name).replace(/\.trust$/, "");
    const tokenId = BigInt(labelhash(label));

    try {
      const expiry: bigint = await this.baseRegistrar().nameExpires(tokenId);
      if (expiry === BigInt(0)) return null;
      return new Date(Number(expiry) * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Get the price to register or renew a name.
   * Duration is in seconds (default: 1 year = 31,557,600s).
   */
  async getPrice(
    name: string,
    durationSeconds: number = 365 * 24 * 60 * 60
  ): Promise<PriceInfo> {
    const label = normalise(name).replace(/\.trust$/, "");

    try {
      const price: bigint = await this.controller().rentPrice(label, durationSeconds);
      return {
        price,
        priceFormatted: formatEther(price),
        currency: "TRUST",
      };
    } catch {
      const fallback = estimatePrice(label, durationSeconds);
      return {
        price: fallback,
        priceFormatted: formatEther(fallback),
        currency: "TRUST",
      };
    }
  }

  /**
   * Get a text record for a name.
   * Common keys: "avatar", "url", "email", "description", "twitter"
   */
  async getTextRecord(name: string, key: string): Promise<string | null> {
    const fullName = toFullName(normalise(name));
    const node = namehash(fullName);

    try {
      const resolverAddress: string = await this.registry().resolver(node);
      if (!resolverAddress || resolverAddress === ZERO_ADDRESS) return null;

      const resolver = this.resolverAt(resolverAddress);
      const value: string = await resolver.text(node, key);
      return value || null;
    } catch {
      return null;
    }
  }

  /**
   * Get full domain info including owner, address, expiry, and common text records.
   */
  async getDomainInfo(name: string): Promise<DomainInfo> {
    const fullName = toFullName(normalise(name));
    const label = fullName.replace(/\.trust$/, "");
    const node = namehash(fullName);
    const tokenId = BigInt(labelhash(label));

    const [available, expiry, owner, resolverAddress] = await Promise.allSettled([
      this.controller().available(label).catch(() => true),
      this.baseRegistrar().nameExpires(tokenId).catch(() => BigInt(0)),
      this.registry().owner(node).catch(() => ZERO_ADDRESS),
      this.registry().resolver(node).catch(() => ZERO_ADDRESS),
    ]);

    const isAvailable =
      available.status === "fulfilled" ? Boolean(available.value) : true;
    const expiryTs =
      expiry.status === "fulfilled" ? Number(expiry.value as bigint) : 0;
    const ownerAddr =
      owner.status === "fulfilled" ? String(owner.value) : ZERO_ADDRESS;
    const resolverAddr =
      resolverAddress.status === "fulfilled" ? String(resolverAddress.value) : ZERO_ADDRESS;

    const expiryDate = expiryTs > 0 ? new Date(expiryTs * 1000) : null;
    const isExpired = expiryDate ? expiryDate < new Date() : false;

    let address: string | null = null;
    let avatar: string | null = null;
    let contentHash: string | null = null;
    const textRecords: Record<string, string> = {};

    if (resolverAddr && resolverAddr !== ZERO_ADDRESS) {
      const resolver = this.resolverAt(resolverAddr);

      const [addrResult, avatarResult, urlResult, descResult, emailResult, chResult] =
        await Promise.allSettled([
          resolver.addr(node),
          resolver.text(node, "avatar"),
          resolver.text(node, "url"),
          resolver.text(node, "description"),
          resolver.text(node, "email"),
          resolver.contenthash(node),
        ]);

      if (addrResult.status === "fulfilled" && addrResult.value !== ZERO_ADDRESS)
        address = String(addrResult.value);
      if (avatarResult.status === "fulfilled" && avatarResult.value)
        avatar = String(avatarResult.value);
      if (urlResult.status === "fulfilled" && urlResult.value)
        textRecords["url"] = String(urlResult.value);
      if (descResult.status === "fulfilled" && descResult.value)
        textRecords["description"] = String(descResult.value);
      if (emailResult.status === "fulfilled" && emailResult.value)
        textRecords["email"] = String(emailResult.value);
      if (chResult.status === "fulfilled" && chResult.value && chResult.value !== "0x")
        contentHash = String(chResult.value);
    }

    return {
      name: fullName,
      owner: ownerAddr !== ZERO_ADDRESS ? ownerAddr : null,
      resolver: resolverAddr !== ZERO_ADDRESS ? resolverAddr : null,
      address,
      expiry: expiryDate,
      isAvailable,
      isExpired,
      textRecords,
      avatar,
      contentHash,
    };
  }

  /**
   * Get the contract addresses in use.
   */
  getAddresses() {
    return { ...this.addresses };
  }
}

function estimatePrice(label: string, durationSeconds: number): bigint {
  const years = durationSeconds / (365 * 24 * 60 * 60);
  const len = label.length;
  const pricePerYear = len <= 3 ? 100 : len === 4 ? 70 : 30;
  return BigInt(Math.round(pricePerYear * years)) * BigInt(10 ** 18);
}
