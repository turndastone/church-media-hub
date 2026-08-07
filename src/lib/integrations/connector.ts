import type {
  ConnectorCommand,
  ConnectorHealth,
  ConnectorResult,
} from "./types";

/**
 * Client for the **Alpha Worship Bridge** local-connector protocol.
 *
 * The web app can never reach a church's EasyWorship 7 / PewBeam instance
 * directly (no public API, and a cloud host can't reach a local PC). Instead
 * a small companion app ("connector") runs on the media PC and exposes:
 *
 *   GET  {base}/health   → 200 { ok: true, app, version }
 *   POST {base}/command  → body { app, action, payload }  → 200 { ok: true }
 *
 * Optional auth: `Authorization: Bearer <token>` when a token is configured.
 * CORS must be enabled on the connector so the browser can reach it; this is
 * the documented contract the connector implementation must satisfy — the
 * connector itself is the integration point, not this client.
 */

const DEFAULT_TIMEOUT_MS = 5000;

/** Validate a connector URL. Returns an error message, or null when valid. */
export function validateConnectorUrl(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return "Enter the connector URL (e.g. http://192.168.1.20:8810).";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "That doesn't look like a valid URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Connector URLs must start with http:// or https://.";
  }
  if (parsed.username || parsed.password) {
    return "Do not include credentials in the URL — use the token field instead.";
  }
  if (!parsed.hostname) return "The connector URL is missing a host.";
  return null;
}

/** Base URL without a trailing slash, or null when invalid. */
export function normalizeConnectorUrl(rawUrl: string): string | null {
  const error = validateConnectorUrl(rawUrl);
  if (error) return null;
  return rawUrl.trim().replace(/\/+$/, "");
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class ConnectorClient {
  /** Health-ping the connector. Reports honest reachability, nothing more. */
  async ping(url: string, token?: string | null, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ConnectorResult> {
    const base = normalizeConnectorUrl(url);
    if (!base) return { ok: false, message: validateConnectorUrl(url) ?? "Invalid URL." };
    try {
      const res = await fetchWithTimeout(
        `${base}/health`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        timeoutMs,
      );
      if (!res.ok) {
        return {
          ok: false,
          message: `Connector answered ${res.status} — check that the Alpha Worship Bridge connector is running.`,
        };
      }
      const body = (await res.json().catch(() => ({}))) as Partial<ConnectorHealth>;
      if (body.ok === false) {
        return { ok: false, message: "Connector reported itself as not ready." };
      }
      const detail = body.version ? ` (v${body.version})` : "";
      return {
        ok: true,
        message: `Local connector reachable${detail}`,
      };
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      return {
        ok: false,
        message: aborted
          ? "Connector timed out — is the Alpha Worship Bridge connector running on the media PC?"
          : `Cannot reach the connector: ${(e as Error).message}`,
      };
    }
  }

  /** Send a command through the connector. */
  async send(
    url: string,
    command: ConnectorCommand,
    token?: string | null,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<ConnectorResult> {
    const base = normalizeConnectorUrl(url);
    if (!base) return { ok: false, message: validateConnectorUrl(url) ?? "Invalid URL." };
    try {
      const res = await fetchWithTimeout(
        `${base}/command`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(command),
        },
        timeoutMs,
      );
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          message: body.error ?? `Connector rejected the command (${res.status}).`,
        };
      }
      return {
        ok: body.ok !== false,
        message: body.ok === false ? body.error ?? "Connector rejected the command." : "Command sent to the local connector.",
      };
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      return {
        ok: false,
        message: aborted
          ? "Connector timed out — is the Alpha Worship Bridge connector running?"
          : `Cannot reach the connector: ${(e as Error).message}`,
      };
    }
  }
}

/** Shared instance for the whole app (stateless HTTP client). */
export const connectorClient = new ConnectorClient();
