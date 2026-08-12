/**
 * seek.li Mailbox API + Bitwarden 兼容层
 *
 * seek.li 仅提供 Mailbox 检查/创建接口，本 Worker 在此基础上
 * 实现 Bitwarden 所需的 /api/alias/random/new 兼容端点。
 */

import type { Env } from "./env";
import {
  authorizeRequest,
  CORS_HEADERS,
  errorResponse,
  extractClientToken,
  jsonResponse,
  proxyToSeekLi,
} from "./http";
import { createRandomMailbox } from "./seekli";

async function handleCheck(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const address = url.searchParams.get("address")?.trim();

  if (!address) {
    return errorResponse("Query parameter 'address' is required", 400);
  }

  const query = new URLSearchParams({ address });
  return proxyToSeekLi(env, `/openapi/v1/mailboxes/check?${query.toString()}`, {
    method: "POST",
  });
}

async function handleCreate(request: Request, env: Env): Promise<Response> {
  let payload: { address?: string };

  try {
    payload = (await request.json()) as { address?: string };
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const address = payload.address?.trim();
  if (!address) {
    return errorResponse("Field 'address' is required in request body", 400);
  }

  return proxyToSeekLi(env, "/openapi/v1/mailboxes", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ address }),
  });
}

/**
 * Bitwarden SimpleLogin 集成会调用此端点创建随机别名。
 * seek.li 无此原生接口，Worker 通过 Mailbox check/create 模拟实现。
 */
async function handleBitwardenAliasRandom(
  request: Request,
  env: Env,
): Promise<Response> {
  const token = extractClientToken(request);
  if (!token) {
    return errorResponse("Missing Authentication header", 401);
  }

  if (env.WORKER_API_TOKEN && token !== env.WORKER_API_TOKEN) {
    return errorResponse("Invalid API key", 401);
  }

  const url = new URL(request.url);
  const hostname = url.searchParams.get("hostname");

  try {
    const alias = await createRandomMailbox(env, hostname);
    return jsonResponse({ alias }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}

function handleHealth(env: Env): Response {
  return jsonResponse({
    service: "simplelogin-mailbox-worker",
    version: "2.0.0",
    upstream: env.SIMPLELOGIN_BASE_URL,
    defaultDomain: env.DEFAULT_EMAIL_DOMAIN ?? null,
    endpoints: {
      bitwarden: "POST /api/alias/random/new?hostname=<optional>",
      check: "POST /mailboxes/check?address=<email>",
      create: "POST /mailboxes  body: { \"address\": \"<email>\" }",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { pathname } = new URL(request.url);

    if (request.method === "GET" && (pathname === "/" || pathname === "/health")) {
      return handleHealth(env);
    }

    if (request.method === "POST" && pathname === "/api/alias/random/new") {
      return handleBitwardenAliasRandom(request, env);
    }

    const authError = authorizeRequest(request, env);
    if (authError) {
      return authError;
    }

    if (request.method === "POST" && pathname === "/mailboxes/check") {
      return handleCheck(request, env);
    }

    if (request.method === "POST" && pathname === "/mailboxes") {
      return handleCreate(request, env);
    }

    return errorResponse("Not Found", 404);
  },
} satisfies ExportedHandler<Env>;
