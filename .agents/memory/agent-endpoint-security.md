---
name: agent endpoint security
description: SSRF and signed-request rules for the AI Agents feature (health checks, endpoint verification, profile edits)
---

# Agent endpoint security

The AI Agents feature lets domain owners register arbitrary HTTP endpoints that the
server later fetches (health probes, `.well-known/tns-agent.json` verification). Two
classes of bug are easy to reintroduce here.

## SSRF: any server-side fetch of an agent-controlled URL must be guarded
**Rule:** never `fetch()` a user/agent-supplied endpoint without first passing it
through `AgentService.validateOutboundUrl()` (blocks non-http(s), localhost/.local/
.internal, private/loopback/link-local/reserved IPv4 + IPv6 literals). The guard is
centralized inside `fetchWithTimeout`, and also runs at write-time in the agent
`/update` route before an endpoint is stored.
**Why:** endpoints are attacker-chosen; without guardrails a `/health?force=true` or
`/verify/confirm` becomes an SSRF probe into internal infra/metadata.
**How to apply:** if you add any new outbound fetch of agent data, route it through
`fetchWithTimeout` (or call `validateOutboundUrl` yourself). This is a hostname/IP
guard only — it does NOT stop DNS-rebinding; use an egress allowlist if that matters.

## Signed-request auth: bind the signature to the payload + reject NaN timestamps
**Rule:** owner-authenticated mutations (e.g. agent `/update`) must include the full
mutable payload in the signed message, e.g.
`Update agent {domain} at {timestamp}: {JSON.stringify(updates)}` — signed identically
on client and server. Timestamp freshness checks must first do
`Number.isFinite(parseInt(ts))` and reject otherwise.
**Why:** signing only `"...{domain} at {timestamp}"` lets a captured signature be
replayed with *different* field values inside the freshness window. And `parseInt("abc")`
is NaN, so every `>`/`<` comparison is false and the freshness window is silently bypassed
(unbounded replay). Both were flagged in code review.
**How to apply:** client `JSON.stringify(updates)` and server re-stringify of the parsed
body must match — relies on V8 preserving JSON key insertion order through the round-trip,
so keep the object shape identical on both sides. The same NaN-timestamp fix applies to the
message retrieval routes (`/api/agents/messages/:domain` and `/history`).
