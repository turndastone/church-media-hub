/**
 * Shared types for the desktop-appliance integrations: OBS Studio,
 * EasyWorship 7, and PewBeam.
 *
 * Honest-by-design: only OBS Studio exposes a real, documented API
 * (obs-websocket v5). EasyWorship 7 and PewBeam have no documented public
 * API for a web client, so they are driven through a *local connector* — a
 * small companion app that the media team runs on the same PC/LAN as the
 * presentation software. The web app never claims to talk to those apps
 * directly; it talks to the connector, which is the integration point.
 */

/** The three desktop integrations this app knows how to configure. */
export type IntegrationApp = "obs" | "easyworship" | "pewbeam";

/**
 * Lifecycle status of an integration as presented to the operator.
 * - `unavailable`      — no configuration has been provided yet.
 * - `requires_connector` — the app has no web API; a local connector is
 *                          required before this integration can be used.
 * - `disconnected`     — configured but not currently connected.
 * - `connecting`       — a connect/test is in flight.
 * - `connected`        — live and verified.
 * - `error`            — the last attempt failed; see `message`.
 */
export type IntegrationStatus =
  | "unavailable"
  | "requires_connector"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** Readable, operator-facing snapshot of one integration. */
export interface IntegrationState {
  app: IntegrationApp;
  status: IntegrationStatus;
  /** Human-readable detail shown under the status pill. */
  message?: string;
  /** Set when `enabled` is toggled off in the UI. */
  disabled?: boolean;
  /** Epoch ms of the last successful connect (from stored config). */
  lastConnectedAt?: number;
}

/** Commands a local connector understands (Alpha Worship Bridge protocol). */
export interface ConnectorCommand {
  /** Which appliance the command is for (obs / easyworship / pewbeam). */
  app: IntegrationApp;
  /** Action name, e.g. "show", "advance", "black". */
  action: string;
  /** Free-form payload for the connector. */
  payload?: Record<string, unknown>;
}

/** Documented response shape for a connector `/health` ping. */
export interface ConnectorHealth {
  ok: boolean;
  app?: IntegrationApp | string;
  version?: string;
  name?: string;
}

/** Result of a ping / command against a local connector. */
export interface ConnectorResult {
  ok: boolean;
  message: string;
}

/** Config that may include secrets (never rendered/logged). */
export interface ConnectionSecrets {
  password: string | null;
  token: string | null;
}
