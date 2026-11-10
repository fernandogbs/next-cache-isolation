# next-cache-isolation

CLI for **dynamic cache-isolation testing** of Next.js App Router apps that use
Cache Components (`'use cache'`, root params, fallback shells). It reproduces
known cross-context contamination modes, compares `actual` vs `expected` per
fixture, and fails closed when the suite is empty or broken.

It does **not** claim formal absence of leaks outside the encoded scenarios.

## What’s shipped (M1–M6)

| Milestone | Delivery |
| --- | --- |
| **M1** | [GHSA-mfr8](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) cold-fill race (`memory`) |
| **M2** | [GHSA-vc7v](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8) nested `use cache` (`warm-then-observe`, `memory`) |
| **M3** | [GHSA-rhh4](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj) binary / `File` cache keys (`warm-then-observe`, `memory`) |
| **M4** | [GHSA-vvgp](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf) fallback-shell poisoning (`warm-then-observe`, `persistent`) |
| **M5** | Custom suite: `next-cache-isolation.yml`, `init`, `doctor` |
| **M6** | Consumer [GitHub Action](action.yml) |
| **0.2.0** | `cachePolicy: external` (Redis), `flight-sentinel`, inline YAML manifests, `tenant-swap` |

Design notes live under [`docs/`](docs/README.md). Advisory version pins live in
[`catalogs/advisories/`](catalogs/advisories/) (not hard-coded in the CLI).

## Requirements

- Node.js **≥ 22**
- Fixture apps use **`next build` + `next start`** only (never `next dev` for suites)

## Install (this repo)

```bash
npm ci
npm run build
# fixture deps (published + custom smoke):
npm --prefix fixtures/ghsa-mfr8-vulnerable ci
npm --prefix fixtures/ghsa-mfr8-patched ci
npm --prefix fixtures/ghsa-vc7v-vulnerable ci
npm --prefix fixtures/ghsa-vc7v-patched ci
npm --prefix fixtures/ghsa-rhh4-vulnerable ci
npm --prefix fixtures/ghsa-rhh4-patched ci
npm --prefix fixtures/ghsa-vvgp-vulnerable ci
npm --prefix fixtures/ghsa-vvgp-patched ci
```

## CLI

```bash
# Published advisory regression (8 fixtures)
node dist/cli/index.js test --suite published --base-port 43110

# Custom suite (paths → nci.fixture.json, or inline manifest in YAML)
node dist/cli/index.js init
node dist/cli/index.js doctor --config next-cache-isolation.yml
node dist/cli/index.js test --suite custom --config next-cache-isolation.yml
```

Example custom configs: [`examples/custom-suite.rhh4.yml`](examples/custom-suite.rhh4.yml),
[`examples/tenant-swap.inline.yml`](examples/tenant-swap.inline.yml).

### Exit codes (tool / published & custom suites)

Priority **`2 > 1 > 3 > 0`**:

| Code | Meaning |
| --- | --- |
| **0** | At least one fixture ran and every non-skip result has `actual === expected` |
| **1** | One or more `actual !== expected` |
| **2** | Infra / execution error (build/start/config) |
| **3** | Nothing applicable ran (empty suite or all skipped) |

Reports are written to `.next-cache-isolation/report.json` with
`suite: "published" | "custom"`.

### Cache policies

| Policy | Behavior |
| --- | --- |
| `memory` | Warm/race and observe on the **same** process (no restart) |
| `persistent` | Warm/poison → **stop** → **start** same `.next` → observe |
| `external` | Reset Redis prefix → warm → **stop** → **start** → observe → reset again |

`external` requires `externalCache` on the manifest (`adapter: redis`,
`urlEnv`, `keyPrefix`). The app under test must point Next’s `cacheHandler` at
the same store. Set `NCI_REDIS_URL` (or the configured env name).

### Oracles and procedures

| Oracle | Use |
| --- | --- |
| `body-sentinel` | HTML/text markers (published GHSA fixtures) |
| `flight-sentinel` | Decode Next text Flight (`RSC: 1`) then apply sentinels |
| `excludes-other-tenants` | Observe sentinel required; every other context sentinel forbidden |

| Procedure | Shape |
| --- | --- |
| `cold-fill-race` | Latch + concurrent fill; `memory` only |
| `warm-then-observe` | Warm path then observe path |
| `tenant-swap` | Same path; warm/observe differ by headers, cookies, and/or `Host` |

## GitHub Action

```yaml
- uses: fernandogbs/next-cache-isolation@main
  with:
    config: next-cache-isolation.yml
    run-doctor: "true"
```

Install fixture dependencies in the workflow **before** the Action. See
[`examples/consumer-ci.yml`](examples/consumer-ci.yml).

Do **not** use `pull_request_target` with secrets for this Action. Fixtures are
excluded from the npm pack (`files` field); the Action builds the CLI from the
action checkout.

## Stress / repeatability

```bash
npm run build
./scripts/stress-suite.sh
```

Repeats the published suite and the rhh4 custom example, asserting exit `0`,
eight published fixtures all matched, and stable `actual === expected` shapes.

## License

MIT
