# Design: GHSA-vvgp vertical slice (M4)

**Date:** 2026-11-07  
**Status:** Spec + tickets + implementation (auto-iterate)  
**Advisory:** [GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf)  
**Related:** [November 2026 Security Release](https://nextjs.org/blog/november-2026-security-release), fix [PR #101106](https://github.com/vercel/next.js/pull/101106)  
**Depends on:** M1–M3 contracts; **new** `cachePolicy: persistent`

## 1. Intent

Reproduce shared fallback-shell cache poisoning when a request supplies a placeholder-shaped route segment under Cache Components with Partial Prefetching disabled. Prove the poison **survives process restart** (disk-backed shell entry) on a vulnerable pin and clearance on `16.4.5`.

## 2. Advisory facts

| Fact | Value |
| --- | --- |
| Condition | `cacheComponents: true`, `partialPrefetching` unset/false, self-hosted `next start` |
| Route shape | Prerenderable param (`generateStaticParams`) requested with a **non-build** value; ≥2 never-prerenderable params below; layout reads the shallower one inside Suspense; blocking fallback shell |
| Trigger | GET with a path segment equal to the percent-encoded bracketed name of the deepest param (e.g. `%5Bthree%5D`) |
| Effect | Shared shell stores request-specific result (persistent 404 via `notFound()`, or substituted param HTML) |
| Persistence | Entry served with `revalidate: false` **across server restarts** |
| Affected | `>= 16.4.0, <= 16.4.4` |
| Patched | `16.4.5` |
| Workaround | `partialPrefetching: true` (fixtures prove the **version** fix with prefetch still false) |

## 3. Goals

1. Fixture pair encoding upstream topology (`/placeholder/[one]/[two]/[three]`).
2. Implement `cachePolicy: persistent`: poison → **stop** → **start same `.next`** → observe.
3. Primary oracle signal: persistent 404 after poison (layout `notFound()` on bad `[two]`).
4. Catalog `GHSA-vvgp-ww4w-46vf.json`.
5. Published suite + CI include eight fixtures (mfr8 + vc7v + rhh4 + vvgp).

## 4. Non-goals

- Custom YAML / init / doctor / consumer Action (M5/M6)
- Proving the HTML-substitution variant as a second scenario (404 is enough for M4)
- Enabling Partial Prefetching as the “patched” signal

## 5. Scenario shape (fixture)

Mirror `test/e2e/app-dir/partial-fallback-shell-upgrade/fixtures/partial-prefetching-disabled`:

- `[one]/layout`: `generateStaticParams` → `{ one: "b" }` only; render `#one`
- `[one]/loading.tsx`: Suspense fallback for deeper segments
- `[two]/layout`: if `two` ∉ `{foo,bar}` → `notFound()`; else render `#two` + children
- `[three]/page` + `loading.tsx`: render `#three`

Attack (warm): `GET /placeholder/c/baz/%5Bthree%5D`  
Observe: `GET /placeholder/c/foo/x` — healthy body must contain `#two`/`foo` and `#three`/`x` at status 200.

Vulnerable pin: `16.4.4` (proven). Patched: `16.4.5`.

`next.config`: `cacheComponents: true` only (match upstream e2e; leave `partialPrefetching` unset so the advisory precondition holds without enabling the workaround).

## 6. Engine: `cachePolicy: persistent`

```text
build → start → warm/poison → stop → start (reuse .next) → observe → stop
```

Reuse `procedure: warm-then-observe` fields. When `cachePolicy === "persistent"`, the runner **must** restart between warm and observe. `memory` remains no-restart.

Do not rebuild between warm and observe (would clear the poisoned shell).

## 7. Oracle

body-sentinel on observe:

- `mustContain`: marker unique to healthy render (e.g. `NCI_VVGP_foo` and/or `id="three">x`)
- `mustNotContain`: optional poison markers
- Status 200 required → poisoned 404 ⇒ FAIL

## 8. Acceptance (M4)

| ID | Criterion |
| --- | --- |
| P-01 | Vulnerable → `actual: FAIL` after poison + restart |
| P-02 | Patched `16.4.5` → `actual: PASS` |
| P-03 | Restart occurs between warm and observe; no rebuild |
| P-04 | Catalog holds ranges/pins |
| P-05 | Published suite + CI include vvgp; exit semantics unchanged |

## 9. Ticket cut

1. Catalog + vvgp fixtures (route topology)  
2. Engine `persistent` policy (restart between warm/observe)  
3. Published suite + CI  

## 10. Confirmed seam

`test --suite published` with eight fixtures; exit 0 iff all `actual === expected`.
