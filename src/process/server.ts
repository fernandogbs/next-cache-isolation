import { spawn, type ChildProcess } from "node:child_process";

import { stopProcessTree } from "./cleanup.js";
import { waitForHealth } from "./health.js";
import type { ProcessManagerOptions, RunningServer } from "./types.js";

export async function startServer(
  options: ProcessManagerOptions,
): Promise<RunningServer> {
  const host = options.host ?? "127.0.0.1";
  const startCommand = options.startCommand ?? ["npx", "next", "start", "-p", String(options.port), "-H", host];
  const [bin, ...args] = startCommand;
  if (!bin) {
    throw new Error("startCommand must include at least one argv element");
  }

  const child = spawn(bin, args, {
    cwd: options.directory,
    env: {
      ...process.env,
      PORT: String(options.port),
      HOSTNAME: host,
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    detached: true,
  });

  if (child.pid === undefined) {
    throw new Error("Failed to start Next.js process (no pid)");
  }

  const baseUrl = `http://${host}:${options.port}`;
  const logs: string[] = [];
  attachLogs(child, logs);

  try {
    await waitForHealth({
      baseUrl,
      healthPath: options.healthPath,
      timeoutMs: options.startupTimeoutMs ?? 60_000,
    });
  } catch (error) {
    await stopProcessTree(child.pid);
    throw new Error(
      `${String(error)}\n--- server logs ---\n${logs.join("").slice(-4_000)}`,
    );
  }

  const pid = child.pid;
  return {
    pid,
    baseUrl,
    stop: async () => {
      await stopProcessTree(pid);
    },
  };
}

function attachLogs(child: ChildProcess, logs: string[]): void {
  const push = (chunk: Buffer) => {
    logs.push(chunk.toString("utf8"));
    if (logs.length > 200) {
      logs.splice(0, logs.length - 200);
    }
  };
  child.stdout?.on("data", push);
  child.stderr?.on("data", push);
}
