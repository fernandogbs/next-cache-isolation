# Design: Custom suite — YAML, init, doctor (M5)

**Date:** 2026-11-07  
**Status:** Spec + tickets + implementation (auto-iterate)  
**Depends on:** M1–M4 (fixture manifests, memory/persistent policies, published suite)  
**Unlocks:** M6 consumer GitHub Action

## 1. Intent

Open the tool to third-party apps: scaffold a config, validate the environment, and run a **custom** suite of fixture directories that already carry `nci.fixture.json` — without inventing a second scenario DSL.

## 2. Goals

1. `next-cache-isolation.yml` (v1) listing fixture paths relative to the config file.
2. `init` writes that file (and a short comment block); refuses to overwrite unless `--force`.
3. `doctor` validates Node engines, config parse, fixture paths, and manifests; surfaces catalog advisory pins as hints (never hard-coded ranges).
4. `test --suite custom [--config <path>]` runs listed fixtures through the existing engine; report `suite: "custom"`.
5. Exit codes for `test` unchanged (`2 > 1 > 3 > 0`). Doctor: `0` healthy, `1` findings, `2` unusable config/infra.

## 3. Non-goals

- Inline scenario authoring in YAML (paths + existing manifests only)
- Tenant HTTP simulator / generic multi-tenant scripting
- Consumer GitHub Action (M6)
- Changing published-suite fixture set

## 4. Config shape

```yaml
version: 1
suite: custom
basePort: 43110  # optional; CLI --base-port wins when passed
fixtures:
  - path: ./path/to/app-with-nci.fixture.json
```

Zod + `yaml` parse. Unknown keys fail closed.

## 5. CLI

| Command | Behavior |
| --- | --- |
| `init [--cwd] [--force]` | Write `next-cache-isolation.yml` with commented example fixtures |
| `doctor [--config]` | Check Node ≥22, config, each fixture load; print OK/FAIL lines |
| `test --suite custom [--config] [--base-port]` | Run custom fixtures |
| `test --suite published` | Unchanged |

Default config path: `./next-cache-isolation.yml` from cwd.

## 6. Confirmed seam

Integration/unit: given a temp dir with a YAML pointing at two real in-repo fixtures (e.g. process-stub is insufficient — use a tiny fake manifest dir OR the rhh4 pair with deps already installed in CI), `test --suite custom` produces `suite: "custom"` and correct exit when outcomes match.

Prefer unit tests that:
1. Parse/validate config
2. `init` writes file
3. `doctor` fails on missing fixture path
4. Custom suite discovery resolves absolute paths from config dirname

Optional CI step: run custom suite against `fixtures/ghsa-rhh4-vulnerable` + `patched` only if install already present (same job as published).

## 7. Ticket cut

1. Config schema + loader + `init`  
2. `doctor` command  
3. `test --suite custom` + report suite label + tests/CI hook  

## 8. Acceptance

| ID | Criterion |
| --- | --- |
| C-01 | `init` creates valid YAML |
| C-02 | `doctor` exit 1 on broken fixture path; 0 when config+fixtures OK |
| C-03 | `test --suite custom` runs listed fixtures; report suite is `custom` |
| C-04 | Published suite behavior unchanged |
| C-05 | Catalog ranges still only in JSON (doctor reads catalog) |
