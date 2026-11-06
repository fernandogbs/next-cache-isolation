import { describe, expect, it } from "vitest";

import { evaluateBodySentinel } from "../../src/validators/body-sentinel.js";

describe("body-sentinel oracle", () => {
  it("passes when expected sentinel is present and forbidden are absent", () => {
    const result = evaluateBodySentinel(
      {
        statusCode: 200,
        body: "<p>NCI_SENTINEL_EN_US</p>",
        mustContain: "NCI_SENTINEL_EN_US",
        mustNotContain: ["NCI_SENTINEL_PT_BR"],
      },
      12,
    );
    expect(result.passed).toBe(true);
  });

  it("fails when a forbidden sentinel leaks into the body", () => {
    const result = evaluateBodySentinel(
      {
        statusCode: 200,
        body: "<p>NCI_SENTINEL_PT_BR</p>",
        mustContain: "NCI_SENTINEL_EN_US",
        mustNotContain: ["NCI_SENTINEL_PT_BR"],
      },
      12,
    );
    expect(result.passed).toBe(false);
    expect(result.forbiddenSentinelsFound).toEqual(["NCI_SENTINEL_PT_BR"]);
  });

  it("passes patched nesting errors when no forbidden sentinel appears", () => {
    const result = evaluateBodySentinel(
      {
        statusCode: 200,
        body: '<html id="__next_error__">Root params are not available</html>',
        mustContain: "NCI_SENTINEL_EN_US",
        mustNotContain: ["NCI_SENTINEL_PT_BR"],
        acceptErrorWithoutForbidden: true,
      },
      12,
    );
    expect(result.passed).toBe(true);
  });
});
