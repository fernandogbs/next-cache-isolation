import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/config/doctor.js";
import { initCustomSuiteConfig } from "../../src/config/init.js";
import {
  loadCustomSuiteConfig,
  resolveConfigPath,
} from "../../src/config/loader.js";

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "nci-m5-"));
}

describe("custom suite config", () => {
  it("resolves fixture paths relative to the config file", async () => {
    const root = await tempDir();
    const configPath = path.join(root, "next-cache-isolation.yml");
    await writeFile(
      configPath,
      [
        "version: 1",
        "suite: custom",
        "fixtures:",
        "  - path: ./apps/a",
        "  - path: apps/b",
      ].join("\n"),
      "utf8",
    );

    const resolved = await loadCustomSuiteConfig(configPath);
    expect(resolved.fixtureDirectories).toEqual([
      path.join(root, "apps/a"),
      path.join(root, "apps/b"),
    ]);
  });

  it("rejects invalid YAML shapes", async () => {
    const root = await tempDir();
    const configPath = path.join(root, "next-cache-isolation.yml");
    await writeFile(configPath, "version: 2\nsuite: custom\nfixtures: []\n", "utf8");
    await expect(loadCustomSuiteConfig(configPath)).rejects.toThrow();
  });
});

describe("init", () => {
  it("writes next-cache-isolation.yml and refuses overwrite without --force", async () => {
    const root = await tempDir();
    const first = await initCustomSuiteConfig({ cwd: root });
    expect(first.created).toBe(true);
    const body = await readFile(first.configPath, "utf8");
    expect(body).toContain("version: 1");
    expect(body).toContain("suite: custom");

    await expect(initCustomSuiteConfig({ cwd: root })).rejects.toThrow(/--force/);
    await initCustomSuiteConfig({ cwd: root, force: true });
  });
});

describe("doctor", () => {
  it("exits 2 when config is missing", async () => {
    const root = await tempDir();
    const report = await runDoctor({ cwd: root });
    expect(report.exitCode).toBe(2);
    expect(report.findings.some((f) => f.code === "config-parse")).toBe(true);
  });

  it("exits 1 when a fixture path is missing", async () => {
    const root = await tempDir();
    const configPath = resolveConfigPath(root);
    await writeFile(
      configPath,
      [
        "version: 1",
        "suite: custom",
        "fixtures:",
        "  - path: ./missing-app",
      ].join("\n"),
      "utf8",
    );
    const report = await runDoctor({ cwd: root });
    expect(report.exitCode).toBe(1);
    expect(
      report.findings.some(
        (f) => f.level === "error" && f.code === "fixture",
      ),
    ).toBe(true);
  });

  it("exits 0 for a valid fixture tree", async () => {
    const root = await tempDir();
    const fixtureDir = path.join(root, "app");
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(
      path.join(fixtureDir, "nci.fixture.json"),
      JSON.stringify({
        id: "custom-ok",
        advisory: "GHSA-rhh4-g77r-r9qj",
        expected: "PASS",
        nextVersion: "16.4.5",
        cacheComponents: true,
        healthPath: "/nci/health",
        cachePolicy: "memory",
        scenario: {
          id: "dummy",
          procedure: "warm-then-observe",
          rootParamName: "user",
          contexts: [
            {
              id: "a",
              rootParams: { user: "a" },
              sentinel: "A",
            },
            {
              id: "b",
              rootParams: { user: "b" },
              sentinel: "B",
            },
          ],
          paths: { warm: "/a", observe: "/b" },
          oracle: {
            type: "body-sentinel",
            warmContext: "a",
            observeContext: "b",
            mustContain: "B",
            mustNotContain: ["A"],
            acceptErrorWithoutForbidden: false,
          },
        },
      }),
      "utf8",
    );
    await writeFile(
      resolveConfigPath(root),
      [
        "version: 1",
        "suite: custom",
        "fixtures:",
        "  - path: ./app",
      ].join("\n"),
      "utf8",
    );

    const report = await runDoctor({ cwd: root });
    expect(report.exitCode).toBe(0);
    expect(report.findings.some((f) => f.code === "catalog-hint")).toBe(true);
  });

  it("accepts inline manifests and skips nci.fixture.json", async () => {
    const root = await tempDir();
    const fixtureDir = path.join(root, "app");
    await mkdir(fixtureDir, { recursive: true });
    // Intentionally no nci.fixture.json on disk.
    await writeFile(
      resolveConfigPath(root),
      [
        "version: 1",
        "suite: custom",
        "fixtures:",
        "  - path: ./app",
        "    manifest:",
        "      id: inline-ok",
        "      advisory: CUSTOM",
        "      expected: PASS",
        "      nextVersion: 16.4.5",
        "      cacheComponents: true",
        "      healthPath: /nci/health",
        "      cachePolicy: memory",
        "      scenario:",
        "        id: tenant-swap-demo",
        "        procedure: tenant-swap",
        "        path: /app",
        "        contexts:",
        "          - id: a",
        "            sentinel: TENANT_A",
        "            headers:",
        "              x-tenant: a",
        "          - id: b",
        "            sentinel: TENANT_B",
        "            headers:",
        "              x-tenant: b",
        "        oracle:",
        "          type: excludes-other-tenants",
        "          warmContext: a",
        "          observeContext: b",
      ].join("\n"),
      "utf8",
    );

    const resolved = await loadCustomSuiteConfig(resolveConfigPath(root));
    expect(resolved.fixtures).toHaveLength(1);
    expect(resolved.fixtures[0]?.manifest?.id).toBe("inline-ok");
    expect(resolved.fixtures[0]?.manifest?.scenario.procedure).toBe(
      "tenant-swap",
    );

    const report = await runDoctor({ cwd: root });
    expect(report.exitCode).toBe(0);
    expect(
      report.findings.some(
        (f) => f.code === "fixture" && f.message.includes("inline"),
      ),
    ).toBe(true);
  });
});
