# Documentation

## Locked decisions and designs

| Doc | Purpose |
| --- | --- |
| [superpowers/specs/2026-11-05-milestone-decision.md](superpowers/specs/2026-11-05-milestone-decision.md) | First milestone was the GHSA-mfr8 **vertical** slice |
| [superpowers/specs/2026-11-05-ghsa-mfr8-slice-design.md](superpowers/specs/2026-11-05-ghsa-mfr8-slice-design.md) | Fixture manifest, `memory` policy, latch, oracle, exit codes |
| [superpowers/specs/2026-11-06-ghsa-vc7v-slice-design.md](superpowers/specs/2026-11-06-ghsa-vc7v-slice-design.md) | M2 nested `use cache` |
| [superpowers/specs/2026-11-06-ghsa-rhh4-slice-design.md](superpowers/specs/2026-11-06-ghsa-rhh4-slice-design.md) | M3 binary / File arguments |
| [superpowers/specs/2026-11-07-ghsa-vvgp-slice-design.md](superpowers/specs/2026-11-07-ghsa-vvgp-slice-design.md) | M4 fallback shell + `persistent` |
| [superpowers/specs/2026-11-07-custom-suite-m5-design.md](superpowers/specs/2026-11-07-custom-suite-m5-design.md) | Custom YAML / `init` / `doctor` |
| [superpowers/specs/2026-11-07-consumer-action-m6-design.md](superpowers/specs/2026-11-07-consumer-action-m6-design.md) | Consumer GitHub Action |
| [architecture/system-overview.md](architecture/system-overview.md) | Module map and per-scenario cache-policy state machines |

## Roadmap status

**M1–M6 shipped on `main`.** GitHub planning issues `#7`–`#11` and their
implementation tickets are closed. Agent workflow notes: [`agents/`](agents/)
+ root [`AGENTS.md`](../AGENTS.md).

### Deferred beyond M6

- Public npm publish (Action builds from checkout today)
- `cachePolicy: external`
- Full Flight/RSC oracle
- Inline YAML scenario authoring (paths + `nci.fixture.json` only)
- Other November 2026 advisories outside the four GHSA slices above
- Dashboard / telemetry / static analysis
