import { keccak256, toUtf8Bytes, concat } from "ethers";

const ZERO_NODE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function namehash(name: string): string {
  if (!name || name === "") return ZERO_NODE;

  const labels = name.split(".");
  let node: string = ZERO_NODE;

  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toUtf8Bytes(labels[i]));
    node = keccak256(concat([node, labelHash]));
  }

  return node;
}

export function labelhash(label: string): string {
  return keccak256(toUtf8Bytes(label));
}

export function normalise(name: string): string {
  return name.toLowerCase().trim();
}

export function toFullName(label: string): string {
  const clean = normalise(label).replace(/\.trust$/, "");
  return `${clean}.trust`;
}
