# ENS change over the Audit

This section catalogs every change made to the audited ENS contracts when adapting them for the Trust Name Service (TNS). The guiding principle is: **contracts are exact clones of audited ENS source with only the minimal changes listed below**.

**Audited ENS Source**: The original ENS contracts were audited by ConsenSys Diligence. The full audit report is available here: [ConsenSys Diligence ENS Audit Report (2019-02)](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

## Diff Reviews

Full side-by-side diffs of every change from the original ENS contracts are available for review:

- **ethregistrar contracts diff**: [intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3/changes)
- **root contracts diff**: [intuition-box/diff_root-contracts_ENS-TNS/pull/2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2/changes)

## Change Categories

All changes fall into these categories:
1. **Naming (partial)**: Only the newer contracts (TNSRegistry, ReverseRegistrar, Resolver, PaymentForwarder) rename to `TNS` type and `tns` variable. The ethregistrar contracts (BaseRegistrar, BaseRegistrarImplementation, ETHRegistrarController, StablePriceOracle) and Root keep the original `ENS` type and `ens` variable from `@ensdomains/ens`. Comment references updated to "TNS" and ".trust" across all contracts.
2. **TLD**: `.eth` → `.trust` (Root's `TRUST_NODE` restriction)
3. **Pragma**: Updated Solidity versions for cross-version compatibility
4. **Import Paths**: Adjusted to match the project's directory structure
5. **Oracle**: `DSValue` interface (MakerDAO-style `read()`) instead of Chainlink's `AggregatorInterface`
6. **New Contracts**: PaymentForwarder (TNS-specific utilities)

---

## ENS: Changes Over Audit

These contracts are part of the [ConsenSys Diligence ENS audit (2019-02)](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope). Changes from the audited source are documented below.

### 1. [BaseRegistrar (`ethregistrar/contracts/BaseRegistrar.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/BaseRegistrar.sol)

**Audited ENS Source**: [`BaseRegistrar.sol`](https://github.com/ensdomains/ethregistrar/blob/master/contracts/BaseRegistrar.sol) from [`ensdomains/ethregistrar`](https://github.com/ensdomains/ethregistrar) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)

**Compiler**: Solidity >=0.4.24

**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS public ens` | `ENS public ens` (unchanged — keeps `ens` variable and `ENS` type from `@ensdomains/ens`) |
| Grace period | `GRACE_PERIOD = 90 days` | `GRACE_PERIOD = 90 days` (unchanged — matches ENS original) |
| Comments | "The ENS registry" | "The TNS registry" |
| Comments | ".eth" references | ".trust" references |
| Comments | "Reclaim ownership in ENS" | "Reclaim ownership in TNS" |

**Logic changes**: None beyond comment updates. Grace period remains 90 days, matching the ENS original. Variable name `ens` and type `ENS` are kept as-is from the original ENS imports. Only comments updated to reference TNS/.trust.

---

### 2. [BaseRegistrarImplementation (`ethregistrar/contracts/BaseRegistrarImplementation.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/BaseRegistrarImplementation.sol)

**Audited ENS Source**: [`BaseRegistrarImplementation.sol`](https://github.com/ensdomains/ethregistrar/blob/master/contracts/BaseRegistrarImplementation.sol) from [`ensdomains/ethregistrar`](https://github.com/ensdomains/ethregistrar) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)

**Compiler**: Solidity ^0.5.0

**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ens` | `ens` (unchanged — keeps original `ens` variable and `ENS` type) |
| Constructor | `(ENS _ens, bytes32 _baseNode)` | `(ENS _ens, bytes32 _baseNode, uint _transferPeriodEnds)` |
| All internal refs | `ens.xxx()` | `ens.xxx()` (unchanged) |
| Comments | "ENS" references | "TNS" references |

**Logic changes**: Added `transferPeriodEnds` constructor parameter for migration period handling. This was already present in the ENS codebase for the .eth migration from the interim registrar. Variable name `ens` and type `ENS` are kept as-is from the original.

---

### 3. [ETHRegistrarController (`ethregistrar/contracts/ETHRegistrarController.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/ETHRegistrarController.sol)

**Audited ENS Source**: [`ETHRegistrarController.sol`](https://github.com/ensdomains/ethregistrar/blob/master/contracts/ETHRegistrarController.sol) from [`ensdomains/ethregistrar`](https://github.com/ensdomains/ethregistrar) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)

**Compiler**: Solidity ^0.5.0

**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Contract name | `ETHRegistrarController` | `ETHRegistrarController` (unchanged in V3) |
| Constructor | `(BaseRegistrar _base, PriceOracle _prices, uint _minCommitmentAge, uint _maxCommitmentAge)` | `(BaseRegistrar _base, PriceOracle _prices)` — commitment ages are constants instead of constructor params |
| `MIN_COMMITMENT_AGE` | Constructor parameter | `uint constant public MIN_COMMITMENT_AGE = 1 minutes` |
| `MAX_COMMITMENT_AGE` | Constructor parameter | `uint constant public MAX_COMMITMENT_AGE = 48 hours` |
| `MIN_REGISTRATION_DURATION` | N/A | `uint constant public MIN_REGISTRATION_DURATION = 28 days` |
| `register()` | `registerWithConfig(name, owner, duration, secret, resolver, addr)` | Simplified to `register(name, owner, duration, secret)` — no resolver/addr params, no auto-setup at registration |
| `makeCommitment()` | `makeCommitmentWithConfig(name, owner, secret, resolver, addr)` | Simplified to `makeCommitment(name, secret)` — no owner, resolver, or addr in hash |
| `commit()` | `require(commitments[commitment] == 0)` | `require(commitments[commitment] + MAX_COMMITMENT_AGE < now)` — allows re-committing after expiry |
| `register()` refund | Reverts on failure | Returns funds on expired commitment or unavailable name instead of reverting |
| `withdraw()` | Sends to `owner()` | Sends to `owner()` (matches ENS) |
| `valid()` | `name.strlen() >= 3` | `name.strlen() >= 3` (matches ENS) |

**Logic changes**:
- **Simplified registration**: No `registerWithConfig` — the `register(name, owner, duration, secret)` function only registers the domain via `base.register()`. It does NOT automatically set a resolver or address record. Users must set resolver records separately after registration.
- **Commitment ages hardcoded**: `MIN_COMMITMENT_AGE` (1 minute) and `MAX_COMMITMENT_AGE` (48 hours) are constants rather than constructor parameters.
- **Commitment**: Simplified `makeCommitment` hashes only `(label, secret)` — doesn't include `owner` in the hash. The `commit` function allows re-committing after the previous commitment expires (vs ENS which requires commitment == 0).
- **Graceful failure**: If the commitment is too old or the name is taken, `register()` refunds `msg.value` and returns instead of reverting.
- **Fee handling**: Registration and renewal fees stay in the controller contract. Owner can withdraw using `withdraw()`.

---

### 4. [StablePriceOracle (`ethregistrar/contracts/StablePriceOracle.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/StablePriceOracle.sol)

**Audited ENS Source**: [`StablePriceOracle.sol`](https://github.com/ensdomains/ethregistrar/blob/master/contracts/StablePriceOracle.sol) from [`ensdomains/ethregistrar`](https://github.com/ensdomains/ethregistrar) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)

**Compiler**: Solidity ^0.5.0

**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Oracle interface | Chainlink `AggregatorInterface` | `DSValue` (MakerDAO-style `read()` returns `bytes32`) |
| Imports | `@chainlink/...` | Uses local `DSValue` interface |

**Logic changes**: Uses `DSValue.read()` instead of Chainlink's `latestAnswer()`. The pricing calculation logic (rent prices array indexed by name length, USD conversion) is otherwise identical.

---

### 5. [DummyOracle (`ethregistrar/contracts/DummyOracle.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/DummyOracle.sol)

**Audited ENS Source**: [`DummyOracle.sol`](https://github.com/ensdomains/ethregistrar/blob/master/contracts/DummyOracle.sol) from [`ensdomains/ethregistrar`](https://github.com/ensdomains/ethregistrar) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)

**Compiler**: Solidity >=0.4.24

**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Oracle interface | Chainlink `AggregatorInterface` | `DSValue`-compatible — `read()` returns `bytes32` instead of `latestAnswer()` |
| Functions | `latestAnswer() returns (int256)` | `read() returns (bytes32)`, `set(uint)` |

**Logic changes**: Adapted to use `DSValue`-style `read()` interface (returns `bytes32`) instead of Chainlink's `latestAnswer()` (returns `int256`). Stores a `uint` value set by owner, returned as `bytes32`. Works with the `StablePriceOracle`'s `DSValue` interface.

---

### 6. [Root (`root/Root.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/root/Root.sol)

**Audited ENS Source**: [`Root.sol`](https://github.com/ensdomains/root/blob/master/contracts/Root.sol) from [`ensdomains/root`](https://github.com/ensdomains/root) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_root-contracts_ENS-TNS`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)

**Compiler**: Solidity ^0.4.24

**Diff**: [root diff PR #2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS public ens` | `ENS public ens` (unchanged — keeps `ens` variable and `ENS` type) |
| All references | `ens.xxx()` | `ens.xxx()` (unchanged) |
| DNS SOA hash | `\x04_ens` | `\x04_ens` (unchanged) |
| TLD restriction | `ETH_NODE` = `keccak256("eth")` | `TRUST_NODE` = `keccak256("trust")` |
| Import | External Ownable | Local `./Ownable.sol` |
| Constructor | `(ENS _ens, DNSSEC _oracle)` | `(ENS _ens, DNSSEC _oracle, address _registrar)` — added registrar param |

**Logic changes**: The `registerTLD` function restricts registration of the `.trust` label (instead of `.eth`) via `require(label != TRUST_NODE)`. Constructor takes an additional `_registrar` address parameter. Variable name `ens`, type `ENS`, and DNS SOA hash `_ens` are all kept as-is from the original ENS source.

---

### 7. [Ownable (`root/Ownable.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/root/Ownable.sol)

**Audited ENS Source**: [`Ownable.sol`](https://github.com/ensdomains/root/blob/master/contracts/Ownable.sol) from [`ensdomains/root`](https://github.com/ensdomains/root) — [Audit scope](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

**TNS Fork**: [`intuition-box/diff_root-contracts_ENS-TNS`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)

**Compiler**: Solidity ^0.4.24

**Diff**: [root diff PR #2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| No significant changes | Legacy Ownable pattern | Same |

**Logic changes**: None. Basic owner/transferOwnership pattern.

---

### 8. [Controllable (`root/Controllable.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/root/Controllable.sol)

**Audited ENS Source**: [`Controllable.sol`](https://github.com/ensdomains/root/blob/master/contracts/Controllable.sol) from [`ensdomains/root`](https://github.com/ensdomains/root)

**Compiler**: Solidity 0.8.0

**Diff**: [root diff PR #2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2/changes)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Import | Varies | `@openzeppelin/contracts/access/Ownable.sol` |

**Logic changes**: None. Standard controller mapping with `setController`/`onlyController`.

---

## ENS: Contracts Not Part of the Audit

These contracts are based on ENS source code but were **not included** in the [ConsenSys Diligence ENS audit (2019-02)](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope).

### 9. [TNSRegistry (`registry/TNSRegistry.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/registry/TNSRegistry.sol)

**ENS Source**: [`ENSRegistry.sol`](https://github.com/ensdomains/ens/blob/master/contracts/ENSRegistry.sol) from [`@ensdomains/ens`](https://github.com/ensdomains/ens)

**Compiler**: Solidity ^0.7.0

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Contract name | `ENSRegistry is ENS` | `TNSRegistry is TNS` |
| Pragma | `^0.5.0` | `^0.7.0` |
| Import | `./ENS.sol` | `./TNS.sol` |
| Function modifiers | Basic | Added `virtual override` (required by 0.7.x) |
| Internal functions | `_setOwner` (not virtual) | `_setOwner` marked `internal virtual` |
| Comments | References "ENS" | References "TNS" |

**Logic changes**: None. Core state variables, events, authorization, and record management are identical.

---

### 10. [TNS Interface (`registry/TNS.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/registry/TNS.sol)

**ENS Source**: [`ENS.sol`](https://github.com/ensdomains/ens/blob/master/contracts/ENS.sol) from [`@ensdomains/ens`](https://github.com/ensdomains/ens)

**Compiler**: Solidity >=0.7.0

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Interface name | `interface ENS` | `interface TNS` |
| Pragma | `>=0.4.24` | `>=0.7.0` |
| Function modifiers | `external` | `external virtual` (required by 0.7.x) |

**Logic changes**: None. Identical interface definitions.

---

### 11. [ReverseRegistrar (`reverseRegistrar/ReverseRegistrar.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/reverseRegistrar/ReverseRegistrar.sol)

**ENS Source**: [`ReverseRegistrar.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/reverseRegistrar/ReverseRegistrar.sol) from [`ensdomains/ens-contracts`](https://github.com/ensdomains/ens-contracts)

**Compiler**: Solidity >=0.8.4

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Type & variable | `ENS public ens` | `TNS public immutable tns` (type changed to `TNS`, variable renamed, marked `immutable`) |
| Import | `@ensdomains/ens-contracts/...` | `../registry/TNS.sol` |
| Inheritance | `Ownable` | `Ownable, Controllable` |
| Constructor | `(ENS ensAddr)` | `(TNS tnsAddr)` — added `oldRegistrar` migration logic |

**Logic changes**: Uses `TNS` type and `tns` variable (renamed from ENS). Inherits from `Controllable` to allow controllers to manage reverse records. Constructor checks for an existing old registrar at the reverse node and calls `claim()` to migrate ownership if found.

---

### 12. [Resolver (`resolvers/Resolver.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/resolvers/Resolver.sol)

**ENS Source**: Based on [`PublicResolver.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/resolvers/PublicResolver.sol) architecture from [`ensdomains/ens-contracts`](https://github.com/ensdomains/ens-contracts)

**Compiler**: Solidity >=0.8.17 <0.9.0

This is a **simplified but functionally equivalent** version of the ENS PublicResolver.

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Type & variable | `ENS ens` | `TNS public immutable tns` (type changed to `TNS`, variable renamed, marked `immutable`) |
| Authorization | Registry owner + operator approvals | Added `trustedController` and `trustedReverseRegistrar` roles (bypass node ownership check) |
| Storage | Multiple inherited profile contracts | Single contract with `versionable_` mappings |
| Admin | N/A | `setTrustedController()`, `setTrustedReverseRegistrar()`, `transferOwnership()` |
| Record versioning | Uses `recordVersions` mapping with inherited profiles | Uses `recordVersions` mapping with inline `versionable_` storage mappings |
| Approval | `OperatorApprovals` + `TokenApprovals` | Same pattern with `_operatorApprovals` and `_tokenApprovals` |

**Logic changes**: Uses `TNS` type and `tns` variable (renamed from ENS). Combines all resolver profiles (addr, name, text, contenthash) into a single contract with manual record versioning. Adds trusted role authorization so the controller and reverse registrar can set records automatically during registration. Implements `clearRecords()` for record version bumping.

---

## Custom TNS Contract

This contract is **TNS-specific** and has no ENS equivalent.

### 13. [PaymentForwarder (`utils/PaymentForwarder.sol`)](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/utils/PaymentForwarder.sol)

**ENS Original**: None — **TNS-specific new contract**

**Compiler**: Solidity ~0.8.17

A utility contract that enables sending native TRUST tokens to `.trust` domain names. Uses the `TNS` type and `tns` variable (immutable). Resolves the domain name through the TNS registry/resolver and forwards the payment to the resolved address. Includes `sendTo(name)` for payments, `resolve(name)` for address lookups, and `namehash(name)` for computing node hashes. Uses custom errors (`DomainNotRegistered`, `NoResolverSet`, `NoAddressSet`, `PaymentFailed`) for gas-efficient reverts.

---

## Other Unchanged Contracts

The following contracts have no changes beyond import path adjustments:

- [`SafeMath.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/SafeMath.sol) — Identical
- [`StringUtils.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/StringUtils.sol) — Identical
- [`PriceOracle.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/PriceOracle.sol) — Identical interface
- [`SimplePriceOracle.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/SimplePriceOracle.sol) — Identical
- [`Migrations.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/Migrations.sol) — Identical
- [`IBaseRegistrar.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/ethregistrar/contracts/IBaseRegistrar.sol) — Variable `ens` -> `tns` in comments only
- [`Multicallable.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/resolvers/Multicallable.sol) — Standard multicall utility
- `resolvers/profiles/*.sol` — Standard resolver interfaces from [`ensdomains/ens-contracts`](https://github.com/ensdomains/ens-contracts/tree/master/contracts/resolvers/profiles)
- [`IReverseRegistrar.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/reverseRegistrar/IReverseRegistrar.sol) — Interface only
- [`ReverseClaimer.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/reverseRegistrar/ReverseClaimer.sol) — Uses TNS import
- [`INameWrapper.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/wrapper/INameWrapper.sol) — Interface only
- `wrapper/NameWrapper.sol` — Not deployed
- [`ERC20Recoverable.sol`](https://github.com/Samoris/TNS/blob/main/contracts/tns-ens/utils/ERC20Recoverable.sol) — Utility, not deployed

---

## Original ENS Repositories

The TNS contracts are forked from the following audited ENS repositories:

| Repository | Description | Link |
|------------|-------------|------|
| `ensdomains/ens` | Core ENS registry and interface | [github.com/ensdomains/ens](https://github.com/ensdomains/ens) |
| `intuition-box/diff_ethregistrar-contracts_ENS-TNS` | ETH registrar, controller, price oracles | [github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) |
| `intuition-box/diff_root-contracts_ENS-TNS` | Root contract, Ownable | [github.com/intuition-box/diff_root-contracts_ENS-TNS](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts) |
| `ensdomains/root` (Controllable) | Controllable contract | [github.com/ensdomains/root/.../Controllable.sol](https://github.com/ensdomains/root/blob/master/contracts/Controllable.sol) |
| `ensdomains/ens-contracts` | Reverse registrar, resolver, wrapper | [github.com/ensdomains/ens-contracts](https://github.com/ensdomains/ens-contracts) |

**Audit Report**: [ConsenSys Diligence ENS Audit Report (2019-02)](https://github.com/ConsenSysDiligence/ens-audit-report-2019-02?tab=readme-ov-file#scope)

---

## Deployed Contract Addresses (V3 — March 2026)

| Contract | Address | Compiler | Verified |
|----------|---------|----------|----------|
| TNSRegistry | `0x3220B4EDbA3a1661F02f1D8D241DBF55EDcDa09e` | v0.7.6 | Yes |
| BaseRegistrarImplementation | `0x1dfeB53EE1bF59d8828e44844e4Dc4a22420E629` | v0.5.17 | Yes |
| DummyOracle | `0x903cc70Cda037249e8D1870Bcd6C528710B73b7E` | v0.8.17 | Yes |
| StablePriceOracle | `0x77C5F276dd8f7321E42580AC53E73859C080A0f2` | v0.5.17 | Yes |
| ReverseRegistrar | `0xE0e5Fa6d1e88506dF21b8E84B9A9D982Ca114080` | v0.8.17 | Yes |
| Root | `0xf3eeEd24448bE5209ddE4e8AD0078240C7b50E24` | v0.4.26 | Yes |
| ETHRegistrarController | `0xf21CD9f92eB1B5E484dF2eeE9EbC86bCAd25Ca80` | v0.5.17 | Yes |
| Resolver | `0x133fAc43bf991dA5B71DBE3a934F4CC607F5545b` | v0.8.17 | Yes |
| PaymentForwarder | `0xF661722f065D8606CC6b5be84296D67D9fe7bD13` | v0.8.17 | Yes |

## Version History

### V3 (Current — March 2026)
- Renamed controller back to `ETHRegistrarController` to match ENS naming exactly
- Removed treasury forwarding — fees stay in controller (owner can withdraw), matching ENS pattern
- All 9 contracts source-code verified on Intuition Explorer
- 143 active domains, 111 unique holders

### V2 (Deprecated)
- Used `TNSRegistrarController` with treasury forwarding
- All domains migrated to V3

### V1 (Deprecated)
- Initial deployment
- All domains migrated to V2, then V3

## Migration

All domains have been successfully migrated through V1 → V2 → V3 with preserved ownership and expiry dates:
- **143 active on-chain domains** on V3
- **111 unique holders**
- V1 and V2 controllers permanently disabled
