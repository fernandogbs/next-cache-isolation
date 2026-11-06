export async function waitForHealth(options: {
  baseUrl: string;
  healthPath: string;
  timeoutMs: number;
}): Promise<void> {
  const url = new URL(options.healthPath, options.baseUrl).toString();
  const deadline = Date.now() + options.timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status === 200) {
        return;
      }
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for health check at ${url}: ${String(lastError)}`,
  );
}
