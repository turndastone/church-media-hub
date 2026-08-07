import type { IntegrationApp, IntegrationState, IntegrationStatus } from "./types";

/**
 * Pure status derivation so the UI, tests, and future backend can agree on
 * what each integration "should" show. The three integrations have different
 * connection models:
 *
 * - OBS: direct websocket. `live` is the socket state. A connector is optional
 *   (cloud-hosted deployments route through the local connector instead).
 * - EasyWorship / PewBeam: no public API → `requires_connector` unless a
 *   connector URL is configured; `connected` only when the connector has
 *   answered a health ping.
 */

export interface StatusInput {
  app: IntegrationApp;
  /** Whether stored config exists (host/port/url present). */
  configured: boolean;
  /** Whether the integration is enabled by the operator. */
  enabled: boolean;
  /** Live connection state (OBS socket, or last connector ping). */
  live: boolean;
  /** True when a connect/test is in flight. */
  busy: boolean;
  /** Last failure message, if any. */
  error?: string | null;
  /** Last success message, if any (cleared on the next failure). */
  success?: string | null;
  lastConnectedAt?: number;
}

export function deriveStatus(input: StatusInput): IntegrationState {
  if (!input.enabled) {
    return {
      app: input.app,
      status: "disconnected",
      disabled: true,
      message: "Integration disabled — enable it to connect.",
      lastConnectedAt: input.lastConnectedAt,
    };
  }
  if (input.busy) {
    return {
      app: input.app,
      status: "connecting",
      message: input.error ?? "Connecting…",
      lastConnectedAt: input.lastConnectedAt,
    };
  }
  if (input.live) {
    return {
      app: input.app,
      status: "connected",
      message: input.success ?? "Connected",
      lastConnectedAt: input.lastConnectedAt ?? Date.now(),
    };
  }
  if (input.error) {
    return {
      app: input.app,
      status: "error",
      message: input.error,
      lastConnectedAt: input.lastConnectedAt,
    };
  }
  if (!input.configured) {
    return {
      app: input.app,
      status: input.app === "obs" ? "unavailable" : "requires_connector",
      message:
        input.app === "obs"
          ? "No connection configured yet."
          : "Requires a local connector — this app has no public web API.",
      lastConnectedAt: input.lastConnectedAt,
    };
  }
  return {
    app: input.app,
    status: "disconnected",
    message: "Configured — not connected.",
    lastConnectedAt: input.lastConnectedAt,
  };
}

/** Stable key used to color-code status pills in the UI. */
export function statusTone(status: IntegrationStatus): "ok" | "warn" | "err" | "muted" {
  switch (status) {
    case "connected":
      return "ok";
    case "connecting":
      return "warn";
    case "error":
      return "err";
    default:
      return "muted";
  }
}
