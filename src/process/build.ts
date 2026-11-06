import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BuildResult } from "./types.js";

export async function buildApp(options: {
  directory: string;
  command: string[];
  env?: NodeJS.ProcessEnv;
}): Promise<BuildResult> {
  const [bin, ...args] = options.command;
  if (!bin) {
    throw new Error("buildCommand must include at least one argv element");
  }

  const exitCode = await runCommand(bin, args, options.directory, options.env);
  const buildId = await readBuildId(options.directory);

  return { exitCode, buildId };
}

async function readBuildId(directory: string): Promise<string | null> {
  try {
    const raw = await readFile(
      path.join(directory, ".next", "BUILD_ID"),
      "utf8",
    );
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

function runCommand(
  bin: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(0);
        return;
      }
      reject(
        new Error(
          `Build failed with exit ${String(code)}\n${stderr.slice(-4_000)}`,
        ),
      );
    });
  });
}
