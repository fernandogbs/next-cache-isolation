# Design: Consumer GitHub Action (M6)

**Date:** 2026-11-07  
**Status:** Spec + implementation (auto-iterate)  
**Depends on:** M5 custom suite (`next-cache-isolation.yml`, `test --suite custom`)  
**Roadmap:** #11

## 1. Intent

Ship `action.yml` so downstream repos can run their configured isolation suite in CI, upload the JSON report, and fail the job when isolation fails — without `pull_request_target` + secrets.

## 2. Goals

1. Composite action at repo root: setup Node 22 → `npm ci` + `build` in `$GITHUB_ACTION_PATH` → optional `doctor` → `test --suite custom` in the consumer workspace.
2. Inputs: `config`, `base-port`, `working-directory`, `run-doctor`, `upload-report`, `report-artifact-name`.
3. Upload `.next-cache-isolation/report.json` as an artifact.
4. Next.js version comes from the **consumer fixture package.json**, not from the Action.
5. Fixtures stay out of the published npm package (unchanged `files` field).

## 3. Non-goals

- Running the in-repo published suite inside the Action
- `pull_request_target` with secrets
- Auto-installing every consumer fixture (caller installs deps before the Action)
- Blocking on npm registry publish (Action builds from the action checkout)

## 4. Constraints (from #11)

- No `pull_request_target` with secrets
- Next.js version from consumer project
- Fixtures must not ship in the npm package

## 5. Seam

This repo CI smokes `uses: ./` with `examples/custom-suite.rhh4.yml` after fixture deps are installed. Example downstream workflow: `examples/consumer-ci.yml`.

## 6. Ticket cut

1. `action.yml` + example consumer workflow  
2. CI smoke invoking the local composite action  

## 7. Acceptance

| ID | Criterion |
| --- | --- |
| A-01 | Composite action runs custom suite from consumer cwd |
| A-02 | Report artifact uploaded when present |
| A-03 | CI smoke with `uses: ./` green |
| A-04 | No `pull_request_target` |
