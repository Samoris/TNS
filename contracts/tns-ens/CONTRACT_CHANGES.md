# TNS Contract Changes from ENS Originals

This document catalogs every change made to the audited ENS contracts when adapting them for the Trust Name Service (TNS). The guiding principle is: **contracts are exact clones of audited ENS source with only the minimal changes listed below**.

## Diff Reviews

Full side-by-side diffs of every change from the original ENS contracts are available for review:

- **ethregistrar contracts diff**: [intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3)
- **root contracts diff**: [intuition-box/diff_root-contracts_ENS-TNS/pull/2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2)

## Change Categories

All changes fall into these categories:
1. **Naming**: `ENS` -> `TNS`, `.eth` -> `.trust`, `ens` -> `tns`
2. **Pragma**: Updated Solidity versions for cross-version compatibility
3. **Import Paths**: Adjusted to match the project's directory structure
4. **New Contracts**: PaymentForwarder and Resolver (TNS-specific utilities)

---

## Contract-by-Contract Changes

### 1. TNSRegistry (`registry/TNSRegistry.sol`)
**ENS Original**: [`ENSRegistry.sol`](https://github.com/ensdomains/ens/blob/master/contracts/ENSRegistry.sol) from [`@ensdomains/ens`](https://github.com/ensdomains/ens)
**Compiler**: Solidity 0.7.6

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

### 2. TNS Interface (`registry/TNS.sol`)
**ENS Original**: [`ENS.sol`](https://github.com/ensdomains/ens/blob/master/contracts/ENS.sol) from [`@ensdomains/ens`](https://github.com/ensdomains/ens)
**Compiler**: Solidity 0.8.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Interface name | `interface ENS` | `interface TNS` |
| Pragma | `>=0.4.24` | `>=0.7.0` |
| Function modifiers | `external` | `external virtual` (required by 0.7.x) |

**Logic changes**: None. Identical interface definitions.

---

### 3. BaseRegistrar (`ethregistrar/contracts/BaseRegistrar.sol`)
**ENS Original**: [`BaseRegistrar.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) from [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
**Compiler**: Solidity 0.5.17
**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS public ens` | `ENS public tns` |
| Comments | "The ENS registry" | "The TNS registry" |
| Comments | ".eth" references | ".trust" references |
| Comments | "Reclaim ownership in ENS" | "Reclaim ownership in TNS" |

**Logic changes**: None. Variable rename only.

---

### 4. BaseRegistrarImplementation (`ethregistrar/contracts/BaseRegistrarImplementation.sol`)
**ENS Original**: [`BaseRegistrarImplementation.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) from [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
**Compiler**: Solidity 0.5.17
**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ens` | `tns` |
| Constructor | `(ENS _ens, bytes32 _baseNode)` | `(ENS _tns, bytes32 _baseNode, uint _transferPeriodEnds)` |
| Comments | "ENS" references | "TNS" references |

**Logic changes**: Added `transferPeriodEnds` constructor parameter for migration period handling. This was already present in the ENS codebase for the .eth migration from the interim registrar.

---

### 5. ETHRegistrarController (`ethregistrar/contracts/ETHRegistrarController.sol`)
**ENS Original**: [`ETHRegistrarController.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) from [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
**Compiler**: Solidity 0.5.17
**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Contract name | `ETHRegistrarController` | `ETHRegistrarController` (unchanged in V3) |
| Constructor | `(BaseRegistrar _base, PriceOracle _prices)` | `(BaseRegistrar _base, PriceOracle _prices)` (matches ENS) |
| `register()` | Funds stay in contract | Funds stay in contract (matches ENS) |
| `renew()` | Funds stay in contract | Funds stay in contract (matches ENS) |
| `withdraw()` | Sends to `owner()` | Sends to `owner()` (matches ENS) |
| `valid()` | `name.strlen() >= 3` | `name.strlen() >= 3` (matches ENS standard) |
| `makeCommitment()` | Includes `owner` param | Simplified to `(name, secret)` only |
| `commit()` | `require(commitments[commitment] == 0)` | `require(commitments[commitment] + MAX_COMMITMENT_AGE < now)` |

**Logic changes**:
- **Fee handling**: Registration and renewal fees stay in the controller contract. Owner can withdraw using `withdraw()`. This matches the standard ENS pattern.
- **Name length**: Minimum valid name length is 3 characters, matching ENS standard. Enforced by the `valid()` function.
- **Commitment**: Simplified `makeCommitment` doesn't include `owner` in the hash. The `commit` function allows re-committing after the previous commitment expires (vs ENS which requires commitment == 0).

---

### 6. StablePriceOracle (`ethregistrar/contracts/StablePriceOracle.sol`)
**ENS Original**: [`StablePriceOracle.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) from [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
**Compiler**: Solidity 0.5.17
**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Oracle interface | Chainlink `AggregatorInterface` | `DSValue` (MakerDAO-style `read()` returns `bytes32`) |
| Imports | `@chainlink/...` | Uses local `DSValue` interface |

**Logic changes**: Uses `DSValue.read()` instead of Chainlink's `latestAnswer()`. The pricing calculation logic (rent prices array indexed by name length, USD conversion) is otherwise identical.

---

### 7. DummyOracle (`ethregistrar/contracts/DummyOracle.sol`)
**ENS Original**: [`DummyOracle.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) from [`intuition-box/diff_ethregistrar-contracts_ENS-TNS`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS)
**Compiler**: Solidity 0.8.17
**Diff**: [ethregistrar diff PR #3](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS/pull/3)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| No significant changes | Implements `DSValue` interface | Same — returns stored value via `read()` |

**Logic changes**: None. Functionally identical mock oracle.

---

### 8. Root (`root/Root.sol`)
**ENS Original**: [`Root.sol`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts) from [`intuition-box/diff_root-contracts_ENS-TNS`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)
**Compiler**: Solidity 0.4.26
**Diff**: [root diff PR #2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS public ens` | `ENS public tns` |
| All references | `ens.xxx()` | `tns.xxx()` |
| DNS SOA hash | `\x04_ens` | `\x04_tns` |
| TLD restriction | `ETH_NODE` | `TRUST_NODE` = `keccak256("trust")` |
| Import | External Ownable | Local `./Ownable.sol` |

**Logic changes**: The `registerTLD` function restricts registration of the `.trust` label (instead of `.eth`). DNS SOA lookup uses `_tns` suffix. Variable renamed throughout.

---

### 9. Ownable (`root/Ownable.sol`)
**ENS Original**: [`Ownable.sol`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts) from [`intuition-box/diff_root-contracts_ENS-TNS`](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/tree/ens-audit/contracts)
**Compiler**: Solidity 0.4.26
**Diff**: [root diff PR #2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| No significant changes | Legacy Ownable pattern | Same |

**Logic changes**: None. Basic owner/transferOwnership pattern.

---

### 10. Controllable (`root/Controllable.sol`)
**ENS Original**: [`Controllable.sol`](https://github.com/ensdomains/root/blob/master/contracts/Controllable.sol) from [`ensdomains/root`](https://github.com/ensdomains/root)
**Compiler**: Solidity 0.8.0
**Diff**: [root diff PR #2](https://github.com/intuition-box/diff_root-contracts_ENS-TNS/pull/2)

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Import | Varies | `@openzeppelin/contracts/access/Ownable.sol` |

**Logic changes**: None. Standard controller mapping with `setController`/`onlyController`.

---

### 11. ReverseRegistrar (`reverseRegistrar/ReverseRegistrar.sol`)
**ENS Original**: [`ReverseRegistrar.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/reverseRegistrar/ReverseRegistrar.sol) from [`ensdomains/ens-contracts`](https://github.com/ensdomains/ens-contracts)
**Compiler**: Solidity 0.8.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS ens` | `TNS tns` |
| Import | `@ensdomains/ens-contracts/...` | `../registry/TNS.sol` |
| Inheritance | `Ownable` | `Ownable, Controllable` |
| Constructor | Basic | Added `oldRegistrar` migration logic |

**Logic changes**: Inherits from `Controllable` to allow controllers to manage reverse records. Constructor checks for an existing old registrar at the reverse node and migrates if found.

---

### 12. Resolver (`resolvers/Resolver.sol`)
**ENS Original**: Based on [`PublicResolver.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/resolvers/PublicResolver.sol) architecture from [`ensdomains/ens-contracts`](https://github.com/ensdomains/ens-contracts)
**Compiler**: Solidity 0.8.17

This is a **simplified but functionally equivalent** version of the ENS PublicResolver.

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS ens` | `TNS tns` |
| Authorization | Registry owner only | Added `trustedController` and `trustedReverseRegistrar` roles |
| Storage | Multiple inherited profile contracts | Single contract with `versionable_` mappings |
| Admin | N/A | `setTrustedController()`, `setTrustedReverseRegistrar()`, `transferOwnership()` |

**Logic changes**: Combines all resolver profiles (addr, name, text, contenthash) into a single contract with manual record versioning. Adds trusted role authorization so the controller and reverse registrar can set records automatically during registration.

---

### 13. PaymentForwarder (`utils/PaymentForwarder.sol`)
**ENS Original**: None — **TNS-specific new contract**
**Compiler**: Solidity 0.8.17

A utility contract that enables sending native TRUST tokens to `.trust` domain names. It resolves the domain name through the TNS registry/resolver and forwards the payment to the resolved address.

---

### 14. Other Unchanged Contracts

The following contracts have no changes beyond import path adjustments:
- [`SafeMath.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) — Identical
- [`StringUtils.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) — Identical
- [`PriceOracle.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) — Identical interface
- [`SimplePriceOracle.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) — Identical
- `ethregistrar/contracts/Migrations.sol` — Identical
- [`IBaseRegistrar.sol`](https://github.com/intuition-box/diff_ethregistrar-contracts_ENS-TNS) — Variable `ens` -> `tns` in comments only
- [`Multicallable.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/resolvers/Multicallable.sol) — Standard multicall utility
- `resolvers/profiles/*.sol` — Standard resolver interfaces from [`ensdomains/ens-contracts`](https://github.com/ensdomains/ens-contracts/tree/master/contracts/resolvers/profiles)
- [`IReverseRegistrar.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/reverseRegistrar/IReverseRegistrar.sol) — Interface only
- [`ReverseClaimer.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/reverseRegistrar/ReverseClaimer.sol) — Uses TNS import
- [`INameWrapper.sol`](https://github.com/ensdomains/ens-contracts/blob/master/contracts/wrapper/INameWrapper.sol) — Interface only
- `wrapper/NameWrapper.sol` — Not deployed
- `utils/ERC20Recoverable.sol` — Utility, not deployed

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
