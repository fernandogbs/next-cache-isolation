# next-cache-isolation

CLI for dynamic cache-isolation testing of multi-tenant Next.js applications
(Cache Components / App Router). Detects cross-context contamination under
concurrent load; does not claim formal absence of leaks.

## Status

Published suite covers GHSA-mfr8, GHSA-vc7v, GHSA-rhh4, and GHSA-vvgp.
**M5** adds a custom suite via `next-cache-isolation.yml`, `init`, and `doctor`.

See [docs/README.md](docs/README.md) for designs and the issue map.

## Quick start (custom suite)

```bash
npx next-cache-isolation init
# edit next-cache-isolation.yml → point fixtures[].path at apps with nci.fixture.json
npx next-cache-isolation doctor
npx next-cache-isolation test --suite custom
```

Published regression suite (this repo):

```bash
npm run build
node dist/cli/index.js test --suite published
```

## GitHub Action

```yaml
- uses: fernandogbs/next-cache-isolation@main
  with:
    config: next-cache-isolation.yml
```

See [examples/consumer-ci.yml](examples/consumer-ci.yml). Install fixture dependencies in the workflow before the Action. Do not use `pull_request_target` with secrets.

## License

MIT
