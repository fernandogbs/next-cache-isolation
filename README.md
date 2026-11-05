# next-cache-isolation

CLI for dynamic cache-isolation testing of multi-tenant Next.js applications
(Cache Components / App Router). Detects cross-context contamination under
concurrent load; does not claim formal absence of leaks.

## Status

Milestone **M1** is specified: a vertical slice that reproduces
[GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)
before generic custom YAML and the other November 2026 cache advisories.

See [docs/README.md](docs/README.md) for the locked decision, slice design,
architecture diagrams, and GitHub issue map.

## License

MIT (intended).
