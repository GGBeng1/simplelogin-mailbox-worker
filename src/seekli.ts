import type { Env } from "./env";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function seekLiFetch(
  env: Env,
  path: string,
  init: RequestInit,
): Promise<Response> {
  if (!env.SIMPLELOGIN_API_TOKEN) {
    throw new Error("SIMPLELOGIN_API_TOKEN is not configured");
  }

  const base = normalizeBaseUrl(env.SIMPLELOGIN_BASE_URL);
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.SIMPLELOGIN_API_TOKEN}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function checkMailboxAvailable(
  env: Env,
  address: string,
): Promise<boolean> {
  const query = new URLSearchParams({ address });
  const response = await seekLiFetch(
    env,
    `/openapi/v1/mailboxes/check?${query.toString()}`,
    { method: "POST" },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`seek.li check failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { data?: { available?: boolean } };
  return json.data?.available === true;
}

export async function createMailbox(
  env: Env,
  address: string,
): Promise<string> {
  const response = await seekLiFetch(env, "/openapi/v1/mailboxes", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`seek.li create failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { data?: { address?: string } };
  return json.data?.address ?? address;
}

export function generateLocalPart(hostname?: string | null): string {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  if (!hostname) {
    return random;
  }

  const safeHost = hostname
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/[^a-zA-Z0-9.-]/g, "")
    .slice(0, 40);

  return safeHost ? `${safeHost}.${random}` : random;
}

export async function createRandomMailbox(
  env: Env,
  hostname?: string | null,
): Promise<string> {
  const domain = env.DEFAULT_EMAIL_DOMAIN?.trim();
  if (!domain) {
    throw new Error("DEFAULT_EMAIL_DOMAIN is not configured on the Worker");
  }

  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const localPart = generateLocalPart(hostname);
    const address = `${localPart}@${domain}`;

    const available = await checkMailboxAvailable(env, address);
    if (!available) {
      continue;
    }

    return createMailbox(env, address);
  }

  throw new Error("Failed to create a unique mailbox address after several attempts");
}
