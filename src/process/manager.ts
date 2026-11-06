import { buildApp } from "./build.js";
import { startServer } from "./server.js";
import type {
  BuildResult,
  ProcessManagerOptions,
  RunningServer,
} from "./types.js";

export class NextProcessManager {
  private server: RunningServer | null = null;
  private lastBuild: BuildResult | null = null;

  constructor(private readonly options: ProcessManagerOptions) {}

  get baseUrl(): string | null {
    return this.server?.baseUrl ?? null;
  }

  get buildId(): string | null {
    return this.lastBuild?.buildId ?? null;
  }

  async build(): Promise<BuildResult> {
    const command =
      this.options.buildCommand ?? ["npx", "next", "build"];
    this.lastBuild = await buildApp({
      directory: this.options.directory,
      command,
    });
    return this.lastBuild;
  }

  async start(): Promise<RunningServer> {
    if (this.server) {
      await this.stop();
    }
    this.server = await startServer(this.options);
    return this.server;
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    const current = this.server;
    this.server = null;
    await current.stop();
  }
}
