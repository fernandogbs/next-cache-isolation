import { spawnSync } from "node:child_process";

export async function stopProcessTree(pid: number): Promise<void> {
  if (pid <= 0) {
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already gone
    }
  }

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) {
      return;
    }
    await sleep(100);
  }

  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }

  // Last resort on Linux when the process group trick fails.
  spawnSync("pkill", ["-KILL", "-P", String(pid)], { stdio: "ignore" });
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
