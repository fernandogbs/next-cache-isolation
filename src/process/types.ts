export type ProcessManagerOptions = {
  directory: string;
  port: number;
  buildCommand?: string[];
  startCommand?: string[];
  healthPath: string;
  startupTimeoutMs?: number;
  host?: string;
};

export type RunningServer = {
  pid: number;
  baseUrl: string;
  stop: () => Promise<void>;
};

export type BuildResult = {
  buildId: string | null;
  exitCode: number;
};
