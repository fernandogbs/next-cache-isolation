# Design: GHSA-rhh4 vertical slice (M3)

**Date:** 2026-11-06  
**Status:** Spec + tickets + implementation (auto-iterate)  
**Advisory:** [GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj)  
**Related:** [November 2026 Security Release](https://nextjs.org/blog/november-2026-security-release), fix [PR #101107](https://github.com/vercel/next.js/pull/101107)  
**Depends on:** M1/M2 contracts (process manager, `warm-then-observe`, body-sentinel, published suite, CI)

## 1. Intent

Reproduce cross-user cache disclosure when distinct binary / `File` arguments to a public `'use cache'` function produce identical cache identity.

Prove `expected: FAIL` on a pinned vulnerable Next.js and `expected: PASS` on `16.4.5`, then fold both fixtures into the published suite alongside mfr8 and vc7v.

## 2. Advisory facts

| Fact | Value |
| --- | --- |
| Condition | App passes security-significant binary args (`Uint8Array` / `Blob` / `File`) into `'use cache'` |
| Trigger shape | Distinct args (different bytes and/or `File` name/type) that the vulnerable encoder maps to the same cache key |
| Effect | Caller B receives caller A's cached result (disclosure) or poisons shared entries |
| Not required | Root params, nested caches, `unstable_cache`, cold race |
| Affected | `>= 16.0.0, <= 16.4.4` |
| Patched | `16.4.5` |
| Fix signal | PR #101107: binary fields framed with `B` + name/type/byteLength; regression e2e `use-cache-binary-args` |

## 3. Goals

1. Fixture pair: vulnerable pin in affected range + patched `16.4.5`.
2. Reuse `procedure: warm-then-observe` under `cachePolicy: memory` (no new engine procedure).
3. Primary collision: same bytes, different `File` name (name/type omitted from key pre-fix).
4. Secondary optional: `Uint8Array` hex pairs from upstream e2e (`44` vs `4400`) if File path fails empirically.
5. Body-sentinel oracle on HTML markers derived from the distinguishing arg.
6. Catalog `catalogs/advisories/GHSA-rhh4-g77r-r9qj.json`.
7. Published suite + CI include mfr8 + vc7v + rhh4 (six fixtures).

## 4. Non-goals

- GHSA-vvgp (persistent / fallback shell) — M4
- Custom YAML / init / doctor / consumer Action
- Changing mfr8 or vc7v semantics

## 5. Scenario shape (fixture)

```ts
async function getCachedFile(file: File) {
  "use cache";
  return `NCI_RHH4_${file.name}`;
}

// page: build File from query bytes + name + type, render marker
```

Procedure (`memory`):

1. Cold start.
2. Warm `/?bytes=44&name=user-a&type=text/plain` → writes entry for mis-keyed identity if vulnerable.
3. Same process, observe `/?bytes=44&name=user-b&type=text/plain`.
4. Oracle: observe must contain `NCI_RHH4_user-b` and must not contain `NCI_RHH4_user-a`.

No latch required. No root-params layout required.

## 6. Manifest

Reuse `warm-then-observe` shape:

```json
{
  "procedure": "warm-then-observe",
  "paths": {
    "warm": "/?bytes=44&name={user}&type=text/plain",
    "observe": "/?bytes=44&name={user}&type=text/plain"
  },
  "oracle": {
    "type": "body-sentinel",
    "warmContext": "a",
    "observeContext": "b",
    "mustContain": "NCI_RHH4_user-b",
    "mustNotContain": ["NCI_RHH4_user-a"]
  }
}
```

Vulnerable pin: try `16.3.0` first (proven for M1/M2). Patched: `16.4.5`.

## 7. Acceptance (M3)

| ID | Criterion |
| --- | --- |
| R-01 | Vulnerable fixture → `actual: FAIL`, `expected: FAIL` |
| R-02 | Patched `16.4.5` → `actual: PASS`, `expected: PASS` |
| R-03 | No process restart between warm and observe |
| R-04 | Catalog JSON holds ranges/pins |
| R-05 | Published suite + CI include rhh4; exit semantics unchanged |

## 8. Ticket cut

1. Catalog + fixture apps (File binary-args collision)  
2. Published suite + CI install/run six fixtures  

## 9. Confirmed seam

`test --suite published` with six fixtures (mfr8×2 + vc7v×2 + rhh4×2); exit 0 iff all `actual === expected`.
