import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingRoot: fixtureRoot,
};

export default nextConfig;
