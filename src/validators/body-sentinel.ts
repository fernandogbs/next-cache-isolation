export type BodySentinelOracleInput = {
  statusCode: number;
  body: string;
  mustContain: string;
  mustNotContain: string[];
  expectedStatus?: number;
  maxExcerptBytes?: number;
  acceptErrorWithoutForbidden?: boolean;
};

export type OracleResult = {
  passed: boolean;
  expectedSentinel: string;
  forbiddenSentinelsFound: string[];
  statusCode: number;
  durationMs: number;
  bodyExcerpt?: string;
  reason?: string;
};

export function evaluateBodySentinel(
  input: BodySentinelOracleInput,
  durationMs: number,
): OracleResult {
  const expectedStatus = input.expectedStatus ?? 200;
  const forbiddenSentinelsFound = input.mustNotContain.filter((marker) =>
    input.body.includes(marker),
  );
  const hasExpected = input.body.includes(input.mustContain);
  const statusOk = input.statusCode === expectedStatus;
  const looksLikeNextError =
    input.body.includes("__next_error__") ||
    input.body.includes("Root params are not available");
  const safeError =
    Boolean(input.acceptErrorWithoutForbidden) &&
    looksLikeNextError &&
    forbiddenSentinelsFound.length === 0;
  const passed =
    forbiddenSentinelsFound.length === 0 &&
    ((statusOk && hasExpected) || safeError);

  let reason: string | undefined;
  if (forbiddenSentinelsFound.length > 0) {
    reason = `found forbidden sentinels: ${forbiddenSentinelsFound.join(", ")}`;
  } else if (safeError) {
    reason = undefined;
  } else if (!statusOk) {
    reason = `expected status ${expectedStatus}, got ${input.statusCode}`;
  } else if (!hasExpected) {
    reason = `missing expected sentinel ${input.mustContain}`;
  }

  const maxExcerpt = input.maxExcerptBytes ?? 2048;
  const bodyExcerpt =
    input.body.length > maxExcerpt
      ? `${input.body.slice(0, maxExcerpt)}…`
      : input.body;

  return {
    passed,
    expectedSentinel: input.mustContain,
    forbiddenSentinelsFound,
    statusCode: input.statusCode,
    durationMs,
    bodyExcerpt,
    ...(reason ? { reason } : {}),
  };
}
