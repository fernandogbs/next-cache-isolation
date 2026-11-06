import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NextProcessManager } from "../../src/process/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const stubDir = path.join(repoRoot, "fixtures/process-stub");
const port = 43100 + Math.floor(Math.random() * 200);

describe("NextProcessManager", () => {
  const manager = new NextProcessManager({
    directory: stubDir,
    port,
    healthPath: "/nci/health",
    buildCommand: ["npm", "run", "build"],
    startCommand: [
      path.join(stubDir, "node_modules/.bin/next"),
      "start",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    startupTimeoutMs: 120_000,
  });

  beforeAll(async () => {
    await manager.build();
  }, 180_000);

  afterAll(async () => {
    await manager.stop();
  });

  it("starts next start, health-checks only healthPath, and stops cleanly", async () => {
    const server = await manager.start();
    expect(server.baseUrl).toBe(`http://127.0.0.1:${port}`);
    expect(manager.buildId).toBeTruthy();

    const health = await fetch(`${server.baseUrl}/nci/health`);
    expect(health.status).toBe(200);

    await manager.stop();

    await expect(
      fetch(`${server.baseUrl}/nci/health`, {
        signal: AbortSignal.timeout(1_000),
      }),
    ).rejects.toBeTruthy();
  }, 180_000);
});
