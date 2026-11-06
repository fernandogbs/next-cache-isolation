# Design: GHSA-vc7v vertical slice (M2)

**Date:** 2026-11-06  
**Status:** Spec published (#20); seams confirmed  
**Advisory:** [GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8)  
**Related:** [November 2026 Security Release](https://nextjs.org/blog/november-2026-security-release)  
**Depends on:** M1 contracts (process manager, fixture manifests, memory policy, body-sentinel oracle, published suite, CI)

## 1. Intent

Reproduce cross-root-param cache disclosure when nested public `'use cache'` functions allow an outer entry to be persisted before the inner function finishes publishing its root-param dependencies (delayed Flight stream metadata).

Prove `expected: FAIL` on a pinned vulnerable Next.js and `expected: PASS` on `16.4.5`, then fold both fixtures into the published suite alongside GHSA-mfr8.

## 2. Advisory facts

| Fact | Value |
| --- | --- |
| Condition | Outer `'use cache'` calls inner `'use cache'`; inner reads root param via `next/root-params` |
| Trigger shape | Inner returns an object with an immediately ready value **and** a slower pending promise; outer finishes without awaiting the slow value |
| Effect | Outer cache entry keyed **without** the root param; later requests for other root-param values reuse that entry |
| Not required | Serving inner from an existing entry; slow custom cache handler (unlike GHSA-h694-7cp9-m8p3) |
| Affected | `>= 16.2.0, <= 16.4.4` (advisory page) |
| Patched | `16.4.5` |
| Leak content | Application-generated; which value wins depends on which invocation wrote first |

## 3. Goals

1. Fixture pair: vulnerable pin in affected range + patched `16.4.5`.
2. Deterministic fill order: warm/write with context A, observe with context B (same process, `cachePolicy: memory`).
3. High-entropy sentinels from inside the inner cached function.
4. Oracle detects foreign sentinel on observe (FAIL) vs correct isolation (PASS).
5. Catalog entry `catalogs/advisories/GHSA-vc7v-qv4w-wrv8.json`.
6. Published suite runs mfr8 **and** vc7v; CI stays green only when all `actual === expected`.

## 4. Non-goals

- Extending custom YAML / init / doctor
- GHSA-rhh4, GHSA-vvgp
- Changing M1 mfr8 race semantics
- Formal Flight/RSC parser (prefer HTML/text markers first; escalate only if HTML false-negatives)

## 5. Scenario shape (fixture)

Conceptual modules:

```ts
// Inner: reads root param, returns early + slow
async function innerCached() {
  "use cache";
  const locale = await locale();
  const early = `NCI_VC7V_${locale}`; // ready immediately
  const slow = delay(holdMs).then(() => `SLOW_${locale}`);
  return { early, slow }; // pending promise still inside
}

// Outer: finishes without awaiting slow
async function outerCached() {
  "use cache";
  const data = await innerCached();
  return data.early; // does not await data.slow
}
```

Procedure (`memory`):

1. Cold start process.
2. Request context A (e.g. `pt-BR`) on the nested route → writes poisoned outer entry if vulnerable.
3. **Same process**, request context B (`en-US`) on the same route → observe body.
4. Oracle: B must contain B’s sentinel and must not contain A’s.

Optional latch: delay inside the inner function’s slow promise (and/or before root-param metadata publish if needed) via `globalThis`, same lesson as M1.

No `unstable_cache` in this advisory.

## 6. Manifest / runner impact

Reuse `nci.fixture.json` with a **new scenario profile** (not the mfr8 direct/unstable race):

```json
{
  "paths": {
    "warm": "/{locale}/nested",
    "observe": "/{locale}/nested"
  },
  "procedure": "warm-then-observe",
  "oracle": {
    "type": "body-sentinel",
    "warmContext": "pt",
    "observeContext": "en",
    "mustContain": "NCI_VC7V_EN_US",
    "mustNotContain": ["NCI_VC7V_PT_BR"]
  }
}
```

Engine changes (minimal):

- Add `runWarmThenObserve` (or generalize `runMemoryRace` into procedure dispatch: `cold-fill-race` | `warm-then-observe`).
- Keep `cachePolicy: memory` (no restart between warm and observe).
- Published suite lists four fixtures: mfr8 vuln/patched + vc7v vuln/patched.

Vulnerable pin: exact version proven empirically in `>=16.2.0, <=16.4.4` (likely reuse `16.3.0` if it reproduces; otherwise pin the first proven).

## 7. Oracle notes

M1’s `body-sentinel` is preferred. Issue #7 warned HTML may false-negative if markers only appear in Flight payloads. Mitigation order:

1. Render `early` sentinel into visible HTML (`<p id="marker">`).
2. If only RSC stream carries it, extend oracle to scan response text for the sentinel substring (still not a full Flight decoder).
3. Do **not** use `acceptErrorWithoutForbidden` unless nesting throws on patched (unlikely for this advisory).

## 8. Acceptance (M2)

| ID | Criterion |
| --- | --- |
| V-01 | Vulnerable fixture → `actual: FAIL`, `expected: FAIL` |
| V-02 | Patched `16.4.5` → `actual: PASS`, `expected: PASS` |
| V-03 | No process restart between warm and observe |
| V-04 | Catalog JSON holds ranges/pins; not hard-coded in doctor |
| V-05 | Published suite + CI include both advisories; exit semantics unchanged |

## 9. Suggested ticket cut (after to-spec)

1. Catalog + fixture apps (vuln/patched) encoding nested early/slow pattern  
2. Engine procedure `warm-then-observe` + manifest fields  
3. Wire published suite + CI artifact still upload  
4. Empirically lock vulnerable pin; document in catalog notes  

## 10. Builder-owned

- Exact vulnerable pin after proof  
- Whether slow branch uses latch/`setTimeout` vs streaming API quirks  
- Whether warm and observe share one path template or distinct routes  
