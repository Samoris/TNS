import { describe, it, expect } from "vitest";
import {
  namehash,
  labelhash,
  normalise,
  toFullName,
  TNSClient,
  CONTRACT_ADDRESSES,
  INTUITION_CHAIN_ID,
  PRICING,
} from "../src/index";

describe("namehash", () => {
  it("returns the zero node for empty input", () => {
    expect(namehash("")).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("matches the expected hash for the trust TLD", () => {
    expect(namehash("trust")).toBe(
      "0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985"
    );
  });

  it("is deterministic for nested labels", () => {
    expect(namehash("alice.trust")).toBe(namehash("alice.trust"));
    expect(namehash("alice.trust")).not.toBe(namehash("bob.trust"));
  });

  it("differs from labelhash", () => {
    expect(namehash("alice.trust")).not.toBe(labelhash("alice"));
  });
});

describe("labelhash", () => {
  it("matches keccak256(utf8('alice'))", () => {
    expect(labelhash("alice")).toBe(
      "0x9c0257114eb9399a2985f8e75dad7600c5d89fe3824ffa99ec1c3eb8bf3b0501"
    );
  });
});

describe("normalise / toFullName", () => {
  it("lowercases and trims", () => {
    expect(normalise("  ALICE  ")).toBe("alice");
  });

  it("appends .trust to bare labels", () => {
    expect(toFullName("alice")).toBe("alice.trust");
  });

  it("does not double-append .trust", () => {
    expect(toFullName("alice.trust")).toBe("alice.trust");
    expect(toFullName("ALICE.TRUST")).toBe("alice.trust");
  });
});

describe("TNSClient.identify", () => {
  const tns = new TNSClient();

  it("identifies an address", () => {
    expect(tns.identify("0x0000000000000000000000000000000000000001")).toBe(
      "address"
    );
  });

  it("identifies a .trust name", () => {
    expect(tns.identify("alice.trust")).toBe("name");
  });

  it("identifies a bare label as a name", () => {
    expect(tns.identify("alice")).toBe("name");
  });

  it("returns 'unknown' for empty input", () => {
    expect(tns.identify("")).toBe("unknown");
    expect(tns.identify("   ")).toBe("unknown");
  });

  it("returns 'unknown' for malformed input", () => {
    expect(tns.identify("not a name!!")).toBe("unknown");
  });
});

describe("TNSClient.resolveName (smart input)", () => {
  const tns = new TNSClient();

  it("returns a checksummed address as-is for an address input", async () => {
    const lower = "0xf1016a7fe89eb9d244c3bfb270071b24619e36c6";
    const result = await tns.resolveName(lower);
    expect(result).toBe("0xf1016a7Fe89EB9D244c3bfB270071b24619e36C6");
  });

  it("returns null for empty input", async () => {
    expect(await tns.resolveName("")).toBeNull();
  });
});

describe("constants", () => {
  it("uses the Intuition mainnet chain id", () => {
    expect(INTUITION_CHAIN_ID).toBe(1155);
  });

  it("exposes the V3 contract addresses", () => {
    expect(CONTRACT_ADDRESSES.registry).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(CONTRACT_ADDRESSES.controller).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(CONTRACT_ADDRESSES.resolver).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(CONTRACT_ADDRESSES.reverseRegistrar).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(CONTRACT_ADDRESSES.baseRegistrar).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("exposes the tiered pricing", () => {
    expect(PRICING["3char"]).toBe(100);
    expect(PRICING["4char"]).toBe(70);
    expect(PRICING["5plusChar"]).toBe(30);
  });
});
