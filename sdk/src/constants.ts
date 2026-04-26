export const INTUITION_CHAIN_ID = 1155;

export const INTUITION_NETWORK = {
  chainId: INTUITION_CHAIN_ID,
  name: "Intuition mainnet",
  rpcUrl: "https://intuition.calderachain.xyz",
  currency: "TRUST",
  explorerUrl: "https://explorer.intuition.systems",
};

export const CONTRACT_ADDRESSES = {
  registry: "0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e",
  baseRegistrar: "0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629",
  controller: "0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80",
  resolver: "0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b",
  reverseRegistrar: "0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080",
  priceOracle: "0x77C5F276dd8f7321E42580AC53E73859C080A0f2",
  paymentForwarder: "0xF661722f065D8606CC6b5be84296D67D9fe7bD13",
} as const;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const PRICING = {
  "3char": 100,
  "4char": 70,
  "5plusChar": 30,
} as const;
