---
name: TNS holder leaderboard chain-truth
description: How holder/points counts are derived on-chain and the RPC constraints that shape the approach
---

## How holder counts must be derived
- The ENS-fork ETHRegistrarController on Intuition **never emits `NameRegistered`** (verified 0 events across full chain history). Do NOT discover domains via controller events.
- BaseRegistrar **does not** support `totalSupply`/`tokenByIndex` (not ERC721Enumerable).
- The only reliable chain-truth source is **BaseRegistrar ERC-721 `Transfer` events** over full block history → unique tokenIds → live `ownerOf`/`nameExpires`.
- Counting holders does NOT need names. Names are best-effort from `server/migrated-domains.json`; new post-migration registrations have no name there and that's fine for points.

**Why:** earlier cache only iterated the migrated-name list, so it under-counted (showed 111 holders when chain truth was 137). A name-list approach can never see post-migration registrations.

## RPC bandwidth constraint (critical)
- Public RPC `https://intuition.calderachain.xyz` enforces a per-IP **bandwidth limit** (error code -31002 "Bandwidth limit exceeded", HTTP 599/429). Bursty backend scanning trips it and makes even `getBlockNumber` fail.
- The chain has millions of blocks (~4.7M as of May 2026) — never use a small fixed lookback window; it silently misses old events. Use large ranges (1M blocks) for `queryFilter` since result sets are tiny.

**How to apply:** any new full-scan backend logic must (1) pace calls (sleeps), (2) be fully defensive so a single RPC failure never throws away the whole result, (3) persist last-known state across refreshes and serve stale-but-valid data, (4) advance scan checkpoint only through the highest *contiguous* successful block, (5) guard against overlapping refreshes, (6) keep refresh interval gentle (≥90s).
