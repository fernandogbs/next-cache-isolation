import type { FixtureRunResult } from "../engine/types.js";

export type SliceReport = {
  toolVersion: string;
  suite: "published";
  nodeVersion: string;
  startedAt: string;
  completedAt: string;
  fixtures: FixtureRunResult[];
  summary: {
    total: number;
    matched: number;
    mismatched: number;
    skipped: number;
    errors: number;
  };
};
