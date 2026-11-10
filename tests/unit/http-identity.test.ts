import { describe, expect, it } from "vitest";

import { buildIdentityHeaders } from "../../src/engine/http.js";

describe("buildIdentityHeaders", () => {
  it("merges headers, cookies, and host from a context", () => {
    const headers = buildIdentityHeaders(
      {
        id: "a",
        rootParams: {},
        sentinel: "A",
        headers: { "x-tenant": "a" },
        cookies: { session: "a", role: "user" },
        host: "a.example.test",
      },
      { RSC: "1" },
    );

    expect(headers).toEqual({
      RSC: "1",
      "x-tenant": "a",
      cookie: "session=a; role=user",
      host: "a.example.test",
    });
  });
});
