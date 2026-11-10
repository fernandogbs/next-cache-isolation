# Design: external cache, Flight oracle, inline YAML, tenant-swap

**Date:** 2026-11-10  
**Status:** Spec + implementation  
**Tool version:** 0.2.0  
**Depends on:** M1–M6 contracts (`memory` / `persistent`, custom suite, body-sentinel)

## 1. Intent

Close four deferred engine surfaces without changing the published GHSA suite
(mfr8, vc7v, rhh4, vvgp keep their procedures and `body-sentinel` oracles).

## 2. Goals

1. `cachePolicy: external` with a Redis adapter that resets by `SCAN` + `DEL`
   on a key prefix (never `FLUSHDB`).
2. `oracle.type: flight-sentinel` that decodes Next text Flight (`RSC: 1`) and
   falls back to `__next_f.push` HTML chunks.
3. Inline `manifest` under custom-suite YAML entries (same Zod schema as
   `nci.fixture.json`; inline wins).
4. Procedure `tenant-swap` with per-context `headers` / `cookies` / `host`, plus
   `oracle.type: excludes-other-tenants`.

## 3. Non-goals

- Public npm publish
- Additional November 2026 advisories or the GHSA-vvgp HTML-substitution variant
- Dashboard, telemetry, static analysis
- Binary React Flight protocol decoder
- Shipping a Redis-backed Next fixture in default CI

## 4. Cache policy: external

Required when `cachePolicy: external`:

```json
{
  "externalCache": {
    "adapter": "redis",
    "urlEnv": "NCI_REDIS_URL",
    "keyPrefix": "nci:",
    "reset": "before-scenario"
  }
}
```

Sequence for `warm-then-observe` and `tenant-swap`:

1. `adapter.reset()` before the scenario
2. build + start + warm
3. stop + start same `.next` (same restart boundary as `persistent`)
4. observe
5. `adapter.reset()` + `dispose()` in `finally`

Missing `urlEnv` or Redis errors → `actual: ERROR`.  
`cold-fill-race` still requires `memory`.

The app under test owns Next `cacheHandler` wiring to the same Redis prefix.

## 5. Oracles

| type | Behavior |
| --- | --- |
| `body-sentinel` | HTML/text markers (unchanged) |
| `flight-sentinel` | Observe with `RSC: 1` + `Accept: text/x-component`; decode then apply sentinel rules |
| `excludes-other-tenants` | `mustContain` = observe context sentinel; `mustNotContain` = every other context sentinel |

## 6. Inline YAML

```yaml
version: 1
suite: custom
fixtures:
  - path: ./app-with-file-manifest
  - path: ./other-app
    manifest: { id: ..., scenario: ... }
```

`doctor` and `test --suite custom` accept both forms. Unknown keys fail closed.

## 7. tenant-swap

```yaml
procedure: tenant-swap
path: /app
contexts:
  - id: a
    sentinel: TENANT_A
    headers: { x-tenant: a }
    cookies: { session: a }
    host: a.example.test
  - id: b
    sentinel: TENANT_B
    headers: { x-tenant: b }
oracle:
  type: excludes-other-tenants
  warmContext: a
  observeContext: b
```

HTTP identity is applied via undici so `Host` is honored. Policies: `memory`,
`persistent`, `external` (same machines as warm-then-observe).

## 8. Acceptance

| ID | Criterion |
| --- | --- |
| E-01 | Fake external adapter sees reset → warm → restart → observe → reset → dispose |
| E-02 | Redis adapter deletes only `keyPrefix*` keys |
| F-01 | Flight decoder finds sentinels split across rows / unicode escapes / `__next_f.push` |
| Y-01 | Inline manifest runs doctor without `nci.fixture.json` |
| T-01 | tenant-swap sends warm/observe identity headers and derives excludes-other-tenants |

## 9. Still deferred

- npm registry publish
- Other advisories / vvgp HTML variant
- Dashboard / telemetry / static analysis
