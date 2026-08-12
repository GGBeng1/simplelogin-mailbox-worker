import type { Env } from "./env";

export const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Authentication",
} as const;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS },
  });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

export function extractClientToken(request: Request): string | null {
  const bearer = request.headers.get("Authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim();
  }

  const authentication = request.headers.get("Authentication");
  return authentication?.trim() ?? null;
}

export function authorizeRequest(request: Request, env: Env): Response | null {
  if (!env.WORKER_API_TOKEN) {
    return null;
  }

  const token = extractClientToken(request);
  if (!token || token !== env.WORKER_API_TOKEN) {
    return errorResponse("Unauthorized", 401);
  }

  return null;
}

export async function proxyToSeekLi(
  env: Env,
  path: string,
  init: RequestInit,
): Promise<Response> {
  if (!env.SIMPLELOGIN_API_TOKEN) {
    return errorResponse("SIMPLELOGIN_API_TOKEN is not configured on the Worker", 500);
  }

  const base = env.SIMPLELOGIN_BASE_URL.replace(/\/+$/, "");
  const upstream = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.SIMPLELOGIN_API_TOKEN}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  const contentType = upstream.headers.get("Content-Type") ?? JSON_HEADERS["Content-Type"];
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      ...CORS_HEADERS,
    },
  });
}
