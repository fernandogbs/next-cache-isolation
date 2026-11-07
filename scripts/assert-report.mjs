import { readFileSync } from "node:fs";

const [reportPath, suite, expectedJson, label] = process.argv.slice(2);
if (!reportPath || !suite || !expectedJson || !label) {
  console.error(
    "usage: assert-report.mjs <report.json> <suite> <expectedJson> <label>",
  );
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const expected = JSON.parse(expectedJson);

if (report.suite !== suite) {
  console.error(`${label}: suite want ${suite} got ${report.suite}`);
  process.exit(1);
}
if (
  !report.nodeVersion ||
  !report.toolVersion ||
  !report.startedAt ||
  !report.completedAt
) {
  console.error(`${label}: missing report envelope fields`);
  process.exit(1);
}
if (report.summary.errors !== 0) {
  console.error(`${label}: summary.errors=${report.summary.errors}`);
  process.exit(1);
}
if (report.summary.mismatched !== 0) {
  console.error(`${label}: summary.mismatched=${report.summary.mismatched}`);
  process.exit(1);
}
if (report.summary.skipped !== 0) {
  console.error(`${label}: summary.skipped=${report.summary.skipped}`);
  process.exit(1);
}
if (
  report.summary.matched !== expected.length ||
  report.summary.total !== expected.length
) {
  console.error(`${label}: summary total/matched mismatch`, report.summary);
  process.exit(1);
}
if (report.fixtures.length !== expected.length) {
  console.error(`${label}: fixture count ${report.fixtures.length}`);
  process.exit(1);
}

for (let i = 0; i < expected.length; i++) {
  const want = expected[i];
  const got = report.fixtures[i];
  if (
    !got ||
    got.id !== want.id ||
    got.expected !== want.expected ||
    got.actual !== want.actual
  ) {
    console.error(`${label}: fixture[${i}] want`, want, "got", {
      id: got?.id,
      expected: got?.expected,
      actual: got?.actual,
    });
    process.exit(1);
  }
  if (!got.scenarioId || !got.nextVersion || !got.advisory || !got.cachePolicy) {
    console.error(`${label}: fixture ${got.id} missing required fields`, got);
    process.exit(1);
  }
  if (got.buildId == null || got.buildId === "") {
    console.error(`${label}: fixture ${got.id} missing buildId`);
    process.exit(1);
  }
  if (got.cachePolicy !== "memory" && got.cachePolicy !== "persistent") {
    console.error(`${label}: unexpected cachePolicy ${got.cachePolicy}`);
    process.exit(1);
  }
}

const vvgp = report.fixtures.find((f) => f.id === "ghsa-vvgp-vulnerable");
if (suite === "published" && vvgp && vvgp.cachePolicy !== "persistent") {
  console.error(`${label}: vvgp vulnerable must use persistent policy`);
  process.exit(1);
}

console.log(
  `${label}: report OK (${expected.length} fixtures, suite=${report.suite})`,
);
