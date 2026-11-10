import { describe, expect, it } from "vitest";

import {
  decodeFlightText,
  evaluateFlightSentinel,
} from "../../src/validators/flight-sentinel.js";

describe("decodeFlightText", () => {
  it("concatenates JSON string payloads across rows", () => {
    const body = [
      '0:["$","div",null,{"children":"NCI_SEN"}]',
      '1:"TINEL_PT"',
      '2:"_BR"',
    ].join("\n");
    const decoded = decodeFlightText(body);
    expect(decoded).toContain("NCI_SENTINEL_PT_BR");
  });

  it("decodes unicode escapes inside flight strings", () => {
    const body = '0:"NCI_\\u0053ENTINEL"';
    expect(decodeFlightText(body)).toContain("NCI_SENTINEL");
  });

  it("falls back to __next_f.push chunks in HTML documents", () => {
    const payload = JSON.stringify(["NCI_SENTINEL_EN_US"]);
    const body = `<html><script>self.__next_f.push([1,${JSON.stringify(payload)}])</script></html>`;
    expect(decodeFlightText(body)).toContain("NCI_SENTINEL_EN_US");
  });
});

describe("evaluateFlightSentinel", () => {
  it("passes when decoded flight contains expected and no forbidden", () => {
    const body = '0:"hello NCI_OK world"\n1:"noise"';
    const result = evaluateFlightSentinel(
      {
        statusCode: 200,
        body,
        mustContain: "NCI_OK",
        mustNotContain: ["NCI_BAD"],
      },
      12,
    );
    expect(result.passed).toBe(true);
  });

  it("fails when a forbidden sentinel appears only after decode", () => {
    const body = '0:"NCI_"\n1:"LEAK"';
    const result = evaluateFlightSentinel(
      {
        statusCode: 200,
        body,
        mustContain: "NCI_OK",
        mustNotContain: ["NCI_LEAK"],
      },
      5,
    );
    expect(result.passed).toBe(false);
    expect(result.forbiddenSentinelsFound).toContain("NCI_LEAK");
  });
});
