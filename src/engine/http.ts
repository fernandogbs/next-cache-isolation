import { request as undiciRequest } from "undici";

import type { ScenarioContext } from "../fixtures/manifest.js";

export type RequestTextResult = {
  status: number;
  body: string;
  durationMs: number;
};

export type RequestTextOptions = {
  url: string;
  context?: ScenarioContext;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  /**
   * Injected for unit tests. When set, Host/cookies still apply via headers
   * object passed to this function (fetch cannot set Host).
   */
  fetchImpl?: typeof fetch;
};

function buildCookieHeader(
  cookies: Record<string, string> | undefined,
): string | undefined {
  if (!cookies) {
    return undefined;
  }
  const parts = Object.entries(cookies).map(
    ([name, value]) => `${name}=${value}`,
  );
  return parts.length > 0 ? parts.join("; ") : undefined;
}

export function buildIdentityHeaders(
  context: ScenarioContext | undefined,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  if (context?.headers) {
    Object.assign(headers, context.headers);
  }
  const cookie = buildCookieHeader(context?.cookies);
  if (cookie) {
    headers.cookie = headers.cookie
      ? `${headers.cookie}; ${cookie}`
      : cookie;
  }
  if (context?.host) {
    headers.host = context.host;
  }
  return headers;
}

/**
 * GET/POST text response with optional tenant identity.
 * Uses undici so the Host header is honored (global fetch strips it).
 */
export async function requestText(
  options: RequestTextOptions,
): Promise<RequestTextResult> {
  const method = options.method ?? "GET";
  const headers = buildIdentityHeaders(options.context, options.headers);
  const started = Date.now();

  if (options.fetchImpl) {
    const init: RequestInit = {
      method,
      headers,
      redirect: "manual",
    };
    if (options.body !== undefined) {
      init.body = options.body;
    }
    const response = await options.fetchImpl(options.url, init);
    const body = await response.text();
    return {
      status: response.status,
      body,
      durationMs: Date.now() - started,
    };
  }

  const response = await undiciRequest(options.url, {
    method,
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
  const body = await response.body.text();
  return {
    status: response.statusCode,
    body,
    durationMs: Date.now() - started,
  };
}
