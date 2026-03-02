# TNS Contract Changes from ENS Originals

This document catalogs every change made to the audited ENS contracts when adapting them for the Trust Name Service (TNS). The guiding principle is: **contracts are exact clones of audited ENS source with only the minimal changes listed below**.

## Change Categories

All changes fall into these categories:
1. **Naming**: `ENS` -> `TNS`, `.eth` -> `.trust`, `ens` -> `tns`
2. **Pragma**: Updated Solidity versions for cross-version compatibility
3. **Import Paths**: Adjusted to match the project's directory structure
4. **Treasury Addition**: Fees forward directly to treasury on register/renew (user-approved)
5. **New Contracts**: PaymentForwarder and Resolver (TNS-specific utilities)

---

## Contract-by-Contract Changes

### 1. TNSRegistry (`registry/TNSRegistry.sol`)
**ENS Original**: `ENSRegistry.sol` from `@ensdomains/ens`
**Compiler**: Solidity 0.8.17

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
**ENS Original**: `ENS.sol` interface from `@ensdomains/ens`
**Compiler**: Solidity 0.8.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Interface name | `interface ENS` | `interface TNS` |
| Pragma | `>=0.4.24` | `>=0.7.0` |
| Function modifiers | `external` | `external virtual` (required by 0.7.x) |

**Logic changes**: None. Identical interface definitions.

---

### 3. BaseRegistrar (`ethregistrar/contracts/BaseRegistrar.sol`)
**ENS Original**: `BaseRegistrar.sol` from `ens_ethregistrar`
**Compiler**: Solidity 0.5.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ENS public ens` | `ENS public tns` |
| Comments | "The ENS registry" | "The TNS registry" |
| Comments | ".eth" references | ".trust" references |
| Comments | "Reclaim ownership in ENS" | "Reclaim ownership in TNS" |

**Logic changes**: None. Variable rename only.

---

### 4. BaseRegistrarImplementation (`ethregistrar/contracts/BaseRegistrarImplementation.sol`)
**ENS Original**: `BaseRegistrarImplementation.sol` from `ens_ethregistrar`
**Compiler**: Solidity 0.5.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Variable name | `ens` | `tns` |
| Constructor | `(ENS _ens, bytes32 _baseNode)` | `(ENS _tns, bytes32 _baseNode, uint _transferPeriodEnds)` |
| Comments | "ENS" references | "TNS" references |

**Logic changes**: Added `transferPeriodEnds` constructor parameter for migration period handling. This was already present in the ENS codebase for the .eth migration from the interim registrar.

---

### 5. TNSRegistrarController (`ethregistrar/contracts/ETHRegistrarController.sol`)
**ENS Original**: `ETHRegistrarController.sol` from `ens_ethregistrar`
**Compiler**: Solidity 0.5.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Contract name | `ETHRegistrarController` | `TNSRegistrarController` |
| Treasury | Not present | Added `address payable public treasury` |
| Constructor | `(BaseRegistrar _base, PriceOracle _prices)` | `(BaseRegistrar _base, PriceOracle _prices, address payable _treasury)` |
| `register()` | Funds stay in contract | `treasury.transfer(cost)` — fees sent to treasury immediately |
| `renew()` | Funds stay in contract | `treasury.transfer(cost)` — fees sent to treasury immediately |
| `withdraw()` | Sends to `owner()` | `treasury.transfer(address(this).balance)` |
| New function | N/A | `setTreasury(address payable _treasury)` — owner can update treasury |
| New event | N/A | `event NewTreasury(address indexed treasury)` |
| `valid()` | `name.strlen() >= 3` | `name.strlen() >= 3` (matches ENS standard) |
| `makeCommitment()` | Includes `owner` param | Simplified to `(name, secret)` only |
| `commit()` | `require(commitments[commitment] == 0)` | `require(commitments[commitment] + MAX_COMMITMENT_AGE < now)` |

**Logic changes**:
- **Treasury**: Registration and renewal fees are forwarded directly to the treasury address on every transaction. This eliminates the need for a separate `withdraw()` call and ensures the treasury receives funds immediately.
- **Name length**: Minimum valid name length is 3 characters, matching ENS standard. Enforced by the `valid()` function.
- **Commitment**: Simplified `makeCommitment` doesn't include `owner` in the hash. The `commit` function allows re-committing after the previous commitment expires (vs ENS which requires commitment == 0).

---

### 6. StablePriceOracle (`ethregistrar/contracts/StablePriceOracle.sol`)
**ENS Original**: `StablePriceOracle.sol` from `ens_ethregistrar`
**Compiler**: Solidity 0.5.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Oracle interface | Chainlink `AggregatorInterface` | `DSValue` (MakerDAO-style `read()` returns `bytes32`) |
| Imports | `@chainlink/...` | Uses local `DSValue` interface |

**Logic changes**: Uses `DSValue.read()` instead of Chainlink's `latestAnswer()`. The pricing calculation logic (rent prices array indexed by name length, USD conversion) is otherwise identical.

---

### 7. DummyOracle (`ethregistrar/contracts/DummyOracle.sol`)
**ENS Original**: `DummyOracle.sol` from `ens_ethregistrar`
**Compiler**: Solidity 0.8.17

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| No significant changes | Implements `DSValue` interface | Same — returns stored value via `read()` |

**Logic changes**: None. Functionally identical mock oracle.

---

### 8. Root (`root/Root.sol`)
**ENS Original**: `Root.sol` from `ens_root`
**Compiler**: Solidity 0.4.26

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
**ENS Original**: Simplified Ownable from ENS root package
**Compiler**: Solidity 0.4.26

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| No significant changes | Legacy Ownable pattern | Same |

**Logic changes**: None. Basic owner/transferOwnership pattern.

---

### 10. Controllable (`root/Controllable.sol`)
**ENS Original**: Controller pattern from ENS
**Compiler**: Solidity 0.8.0

| Change | Original (ENS) | Modified (TNS) |
|--------|----------------|-----------------|
| Import | Varies | `@openzeppelin/contracts/access/Ownable.sol` |

**Logic changes**: None. Standard controller mapping with `setController`/`onlyController`.

---

### 11. ReverseRegistrar (`reverseRegistrar/ReverseRegistrar.sol`)
**ENS Original**: `ReverseRegistrar.sol` from `@ensdomains/ens-contracts`
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
**ENS Original**: Based on ENS `PublicResolver` architecture
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
- `ethregistrar/contracts/SafeMath.sol` — Identical
- `ethregistrar/contracts/StringUtils.sol` — Identical
- `ethregistrar/contracts/PriceOracle.sol` — Identical interface
- `ethregistrar/contracts/SimplePriceOracle.sol` — Identical
- `ethregistrar/contracts/Migrations.sol` — Identical
- `ethregistrar/IBaseRegistrar.sol` — Variable `ens` -> `tns` in comments only
- `resolvers/Multicallable.sol` — Standard multicall utility
- `resolvers/profiles/*.sol` — Standard resolver interfaces
- `reverseRegistrar/IReverseRegistrar.sol` — Interface only
- `reverseRegistrar/ReverseClaimer.sol` — Uses TNS import
- `wrapper/INameWrapper.sol` — Interface only
- `wrapper/NameWrapper.sol` — Not deployed
- `utils/ERC20Recoverable.sol` — Utility, not deployed

---

## Deployed Contract Addresses (V2 — March 2026)

| Contract | Address | Compiler |
|----------|---------|----------|
| TNSRegistry | `0x6C9B42e582ce2b5d514cDa74acc476d519cd1c99` | v0.8.17 |
| BaseRegistrarImplementation | `0xABD2b0a55420b6D99205e561F7Fb27BE884C1dc4` | v0.5.17 |
| DummyOracle | `0xE4DA8E7A4378756B49Ca664C4690499A8e9B26cb` | v0.8.17 |
| StablePriceOracle | `0x6F258639D183Fb7955B93d086FA9300eED79383A` | v0.5.17 |
| ReverseRegistrar | `0x78Cd4f5149060De05a84040283812b0c056972eD` | v0.8.17 |
| Root | `0x46BAEACf2B083634FE4FC6b1140B3e809D61cf75` | v0.4.26 |
| TNSRegistrarController | `0x7C553152e7e4c9d1498D921FB5bd05bDf287f268` | v0.5.17 |
| Resolver | `0xF8Fc1F7c4B206349278Dbd7DA433F18887276be5` | v0.8.17 |
| PaymentForwarder | `0xDdecb17b645a3d9540a9B9061D0182eC2ef88a7F` | v0.8.17 |
| Treasury | `0x629A5386F73283F80847154d16E359192a891f86` | N/A |

## Migration

All 258 domains from V1 contracts were successfully migrated to V2 with preserved ownership and expiry dates. V1 contracts are deprecated.
