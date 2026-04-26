import { useState, useEffect, useCallback, useRef } from "react";
import { TNSClient, DomainInfo, PriceInfo } from "./client";
import { normalise, toFullName } from "./namehash";
import { INTUITION_NETWORK } from "./constants";

const DEFAULT_CLIENT = new TNSClient();

function getClient(client?: TNSClient): TNSClient {
  return client ?? DEFAULT_CLIENT;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export interface UseTNSResolveResult {
  address: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Smart-resolve any input — accepts either a `.trust` name OR an address.
 * - Address input → returned as-is (checksummed).
 * - Name input → resolved to its address.
 *
 * Drop-in replacement for "user typed a recipient" inputs.
 *
 * @example
 * const { address, loading } = useTNSResolveName(input);
 */
export function useTNSResolveName(
  input: string | null | undefined,
  client?: TNSClient
): UseTNSResolveResult {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tns = getClient(client);

  useEffect(() => {
    if (!input) {
      setAddress(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    tns
      .resolveName(input)
      .then((addr) => {
        if (!cancelled) {
          setAddress(addr);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return { address, loading, error };
}

/**
 * Smart display — accepts either an address OR a `.trust` name.
 * Returns the primary name (if set), or a shortened address otherwise.
 *
 * @example
 * const { displayName } = useTNSDisplayName("0xabc…");
 */
export function useTNSDisplayName(
  input: string | null | undefined,
  client?: TNSClient
): { displayName: string; loading: boolean } {
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const tns = getClient(client);

  useEffect(() => {
    if (!input) {
      setDisplayName("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    tns.displayName(input).then((name) => {
      if (!cancelled) {
        setDisplayName(name);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return { displayName, loading };
}

/**
 * Resolve a .trust name to an address.
 *
 * @example
 * const { address, loading } = useTNSResolve("alice.trust");
 */
export function useTNSResolve(
  name: string | null | undefined,
  client?: TNSClient
): UseTNSResolveResult {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tns = getClient(client);

  useEffect(() => {
    if (!name) {
      setAddress(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    tns
      .resolve(name)
      .then((addr) => {
        if (!cancelled) {
          setAddress(addr);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return { address, loading, error };
}

export interface UseTNSLookupResult {
  name: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Reverse-resolve an address to its primary .trust name.
 *
 * @example
 * const { name, loading } = useTNSLookup("0xabc...");
 */
export function useTNSLookup(
  address: string | null | undefined,
  client?: TNSClient
): UseTNSLookupResult {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tns = getClient(client);

  useEffect(() => {
    if (!address) {
      setName(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    tns
      .lookupAddress(address)
      .then((n) => {
        if (!cancelled) {
          setName(n);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { name, loading, error };
}

export interface UseTNSAvailabilityResult {
  available: boolean | null;
  price: PriceInfo | null;
  loading: boolean;
  error: string | null;
}

/**
 * Check if a .trust name is available and get its price.
 *
 * @example
 * const { available, price, loading } = useTNSAvailability("myname");
 */
export function useTNSAvailability(
  name: string | null | undefined,
  durationSeconds?: number,
  client?: TNSClient
): UseTNSAvailabilityResult {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [price, setPrice] = useState<PriceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tns = getClient(client);

  useEffect(() => {
    const label = name ? normalise(name).replace(/\.trust$/, "") : "";
    if (!label || label.length < 3) {
      setAvailable(null);
      setPrice(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      tns.isAvailable(label),
      tns.getPrice(label, durationSeconds),
    ])
      .then(([avail, p]) => {
        if (!cancelled) {
          setAvailable(avail);
          setPrice(p);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name, durationSeconds]);

  return { available, price, loading, error };
}

export interface UseTNSDomainInfoResult {
  info: DomainInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Get full domain info for a .trust name.
 */
export function useTNSDomainInfo(
  name: string | null | undefined,
  client?: TNSClient
): UseTNSDomainInfoResult {
  const [info, setInfo] = useState<DomainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const tns = getClient(client);

  useEffect(() => {
    if (!name) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    tns
      .getDomainInfo(name)
      .then((d) => {
        if (!cancelled) {
          setInfo(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e?.message ?? e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { info, loading, error, refetch };
}

// ─── TNSNamePicker component ─────────────────────────────────────────────────

export interface TNSNamePickerProps {
  /** Called when the user confirms a name selection. */
  onSelect: (name: string, address: string | null) => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Pre-fill the search with this value */
  defaultValue?: string;
  /** TNSClient instance (uses default if omitted) */
  client?: TNSClient;
  /** Additional CSS class for the root element */
  className?: string;
}

/**
 * A ready-to-use name search and selection component.
 * Lets users type a .trust name, see its availability and price, and confirm the selection.
 *
 * @example
 * <TNSNamePicker onSelect={(name, address) => console.log(name, address)} />
 */
export function TNSNamePicker({
  onSelect,
  placeholder = "Search .trust names…",
  defaultValue = "",
  client,
  className = "",
}: TNSNamePickerProps) {
  const [input, setInput] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { available, price, loading } = useTNSAvailability(query, undefined, client);
  const { address } = useTNSResolve(query && !available ? query : null, client);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const label = normalise(value).replace(/\.trust$/, "");
      setQuery(label.length >= 3 ? toFullName(label) : "");
    }, 400);
  };

  const handleSelect = () => {
    if (!query) return;
    onSelect(query, address);
  };

  const fullName = query;
  const hasResult = !!fullName && available !== null;

  const badgeStyle = available
    ? { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
    : { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };

  return (
    <div
      className={className}
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 480,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "2px solid #e2e8f0",
          borderRadius: 10,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}
      >
        <span
          style={{
            padding: "0 12px",
            color: "#94a3b8",
            fontSize: 18,
            userSelect: "none",
          }}
        >
          🔎
        </span>
        <input
          value={input}
          onChange={handleChange}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: "12px 8px 12px 0",
            fontSize: 16,
            background: "transparent",
          }}
        />
        {loading && (
          <span style={{ padding: "0 12px", color: "#94a3b8", fontSize: 13 }}>
            checking…
          </span>
        )}
      </div>

      {hasResult && (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#1e293b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {fullName}
              </div>
              {price && (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  {price.priceFormatted} {price.currency} / year
                </div>
              )}
              {!available && address && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    marginTop: 2,
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  → {address}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span
                style={{
                  ...badgeStyle,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {available ? "Available" : "Taken"}
              </span>

              {available && (
                <button
                  onClick={handleSelect}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Select
                </button>
              )}
            </div>
          </div>

          {!available && (
            <div
              style={{
                borderTop: "1px solid #f1f5f9",
                padding: "10px 16px",
                fontSize: 13,
                color: "#64748b",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Already registered</span>
              <a
                href={`${INTUITION_NETWORK.rpcUrl.replace("rpc.", "")}/domain/${fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                View on TNS ↗
              </a>
            </div>
          )}
        </div>
      )}

      {query && available === null && !loading && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8", paddingLeft: 4 }}>
          Name must be at least 3 characters.
        </div>
      )}
    </div>
  );
}
