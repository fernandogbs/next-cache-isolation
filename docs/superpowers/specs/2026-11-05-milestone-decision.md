# Milestone decision — vertical slice first

**Date:** 2026-11-05  
**Status:** Locked  
**Project:** next-cache-isolation 0.1.0

## Decision

The first verifiable milestone is a **vertical slice** that reproduces
[GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)
end to end.

It is **not** the horizontal foundation of the original product spec
(CLI shell → YAML → process manager → tenant simulator → generic
concurrency engine → validators → fixtures).

## Why

The generic scenario contract (`tenants` + path + `contains` /
`excludes-other-tenants`) does not describe this advisory. Building that
stack first would discover the real fixture contract only after eight
days of scaffolding.

## What “done” means for milestone 1

1. A vulnerable fixture (Next.js in the affected range) yields
   `actual: FAIL` with `expected: FAIL`.
2. A patched fixture on Next.js `16.4.5` yields `actual: PASS` with
   `expected: PASS`.
3. The same process that ran the cold-fill race is still alive when the
   observation request runs (cache policy `memory`).
4. A JSON report records Next.js version, Node.js version, build ID,
   scenario id, and outcome.
5. Exit codes distinguish isolation failure, execution error, and empty
   coverage.

## Explicitly deferred until after this slice

- `init` / `doctor` UX polish beyond what the slice needs
- Generic custom YAML scenarios for third-party apps
- The other three November 2026 cache advisories
- GitHub Action for consumer repos
- Dashboard, telemetry, static analysis

## Source

Locked from the “Gaps antes do backlog” review of the 2026-11-04 product
specification (architecture provocations §1–§8).
