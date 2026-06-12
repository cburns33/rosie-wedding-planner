/**
 * Read-only client for Zola's unofficial mobile API (`mobile-api.zola.com`).
 *
 * Auth adapts the public, MIT-licensed `chrischall/zola-mcp` project
 * (https://github.com/chrischall/zola-mcp): the `usr` cookie JWT is used as a
 * refresh token to mint a short-lived (~30 min) session token. We deliberately
 * implement ONLY read endpoints — no write/booking tools.
 *
 * Token source: `process.env.ZOLA_REFRESH_TOKEN`. The token never leaves the
 * server and is never logged.
 */

const MOBILE_BASE_URL = "https://mobile-api.zola.com";
const USER_AGENT = "Zola/42.5.0 (iPad; iOS 26.4; Scale/2.0)";

export interface ZolaContext {
  weddingAccountId: number;
  weddingId: number;
  registryId: string | null;
  weddingDate: string | null;
  weddingSlug: string | null;
}

/** Decode the `exp` (seconds since epoch) claim from a JWT without verifying. */
function decodeJwtExp(token: string): number {
  const payload = decodeJwtPayload(token);
  if (typeof payload.exp !== "number") {
    throw new Error("JWT missing exp claim");
  }
  return payload.exp;
}

/** Decode the session id claim Zola's WAF expects echoed back, if present. */
function decodeJwtSessionId(token: string): string | null {
  try {
    const payload = decodeJwtPayload(token);
    const id = payload.session_id ?? payload.sid ?? payload.jti;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Malformed JWT");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(base64, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export class ZolaAuthError extends Error {}

export class ZolaClient {
  private sessionToken: string | null = null;
  private sessionExpiry: Date | null = null;
  private cachedContext: ZolaContext | null = null;
  private readonly deviceSessionId = crypto.randomUUID().toUpperCase();

  constructor(private readonly refreshToken: string) {}

  /** Read-only JSON GET against the mobile API. */
  async get<T>(path: string): Promise<T> {
    await this.ensureSession();
    return this.send<T>(path, false);
  }

  /** Wedding account / registry IDs, resolved once per client instance. */
  async getContext(): Promise<ZolaContext> {
    if (this.cachedContext) return this.cachedContext;

    const res = await this.get<{
      data: {
        wedding_account: { wedding_account_id: number };
        wedding: { wedding_id: number; wedding_date: string | null; slug: string | null };
        registry: { id: string } | null;
      };
    }>("/v3/users/me/context");

    this.cachedContext = {
      weddingAccountId: res.data.wedding_account.wedding_account_id,
      weddingId: res.data.wedding.wedding_id,
      registryId: res.data.registry?.id ?? null,
      weddingDate: res.data.wedding.wedding_date,
      weddingSlug: res.data.wedding.slug,
    };
    return this.cachedContext;
  }

  private async send<T>(path: string, isAuthRetry: boolean): Promise<T> {
    const sessionId = decodeJwtSessionId(this.sessionToken!);
    const response = await fetch(`${MOBILE_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.sessionToken}`,
        "x-zola-platform-type": "iphone_app",
        "x-zola-session-id": this.deviceSessionId,
        "user-agent": USER_AGENT,
        ...(sessionId ? { "x-zola-user-session-id": sessionId } : {}),
      },
    });

    if (response.status === 401 && !isAuthRetry) {
      this.sessionToken = null;
      this.sessionExpiry = null;
      await this.refresh();
      return this.send<T>(path, true);
    }

    if (!response.ok) {
      // Body is untrusted (could echo request data); never include it verbatim.
      throw new Error(`Zola API ${response.status} on GET ${path}`);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  private async ensureSession(): Promise<void> {
    if (
      this.sessionToken &&
      this.sessionExpiry &&
      this.sessionExpiry.getTime() - Date.now() > 5 * 60 * 1000
    ) {
      return;
    }
    await this.refresh();
  }

  /** POST /v3/sessions/refresh with the refresh JWT → short-lived session token. */
  private async refresh(): Promise<void> {
    const response = await fetch(`${MOBILE_BASE_URL}/v3/sessions/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-zola-platform-type": "iphone_app",
        "x-zola-session-id": this.deviceSessionId,
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify({ token: this.refreshToken }),
    });

    if (!response.ok) {
      // Do NOT include the response body — the request carried the refresh JWT
      // and an upstream proxy could reflect it back.
      throw new ZolaAuthError(`Zola session refresh failed (${response.status})`);
    }

    const result = (await response.json()) as {
      data: { session_token: string };
    };
    const sessionToken = result.data.session_token;
    this.sessionToken = sessionToken;
    this.sessionExpiry = new Date(decodeJwtExp(sessionToken) * 1000);
  }
}

/**
 * Build a client from env, or null if no token is configured (graceful
 * degradation: callers treat null as "integration not set up yet").
 */
export function getZolaClient(): ZolaClient | null {
  const token = process.env.ZOLA_REFRESH_TOKEN;
  if (!token) return null;
  return new ZolaClient(token);
}
