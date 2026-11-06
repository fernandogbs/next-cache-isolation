import type { SliceReport } from "./types.js";

export function printTerminalReport(report: SliceReport): void {
  console.log("NEXT CACHE ISOLATION TESTER");
  console.log("");
  console.log(`Suite: ${report.suite}`);
  console.log(`Node.js: ${report.nodeVersion}`);
  console.log(`Tool: ${report.toolVersion}`);
  console.log("");

  for (const fixture of report.fixtures) {
    const match =
      fixture.actual === "SKIP" || fixture.actual === "ERROR"
        ? fixture.actual
        : fixture.actual === fixture.expected
          ? "MATCH"
          : "MISMATCH";
    console.log(
      `  ${fixture.id}  expected=${fixture.expected} actual=${fixture.actual}  [${match}]`,
    );
    if (fixture.errorMessage) {
      console.log(`    error: ${fixture.errorMessage.split("\n")[0]}`);
    }
    if (fixture.oracle?.reason) {
      console.log(`    oracle: ${fixture.oracle.reason}`);
    }
  }

  console.log("");
  console.log(
    `RESULT: ${report.summary.matched} matched / ${report.summary.mismatched} mismatched / ${report.summary.skipped} skipped / ${report.summary.errors} errors`,
  );
}
