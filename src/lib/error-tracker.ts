import { useSyncExternalStore } from "react";

/**
 * Lightweight client-side error tracker.
 *
 * Captures runtime errors, unhandled promise rejections, React error-boundary
 * crashes, and console.error calls into a persisted, deduplicated log. The
 * admin dashboard reads the log live and can reset it instantly.
 */

export type ErrorSource =
  | "runtime"
  | "promise"
  | "console"
  | "boundary"
  | "manual";

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  source: ErrorSource;
  context?: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

const STORAGE_KEY = "workspace_error_log_v1";
const MAX_ENTRIES = 120;
const MAX_MESSAGE = 600;
const MAX_STACK = 4000;

const isBrowser = typeof window !== "undefined";

const SOURCE_LABELS: Record<ErrorSource, string> = {
  runtime: "Runtime",
  promise: "Promise",
  console: "Console",
  boundary: "Boundary",
  manual: "Reported",
};

export function errorSourceLabel(source: ErrorSource): string {
  return SOURCE_LABELS[source] ?? "Error";
}

function readEntries(): TrackedError[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is TrackedError =>
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as TrackedError).message === "string",
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

let entries: TrackedError[] = readEntries();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A subscriber should never break the tracker.
    }
  }
}

function persist() {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable or full — the in-memory log still works.
  }
}

function toText(value: unknown): string {
  if (value instanceof Error) return value.message || value.name || "Error";
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stackOf(value: unknown): string | undefined {
  if (value instanceof Error && value.stack) {
    return value.stack.slice(0, MAX_STACK);
  }
  return undefined;
}

function fingerprint(source: ErrorSource, message: string, context?: string) {
  return `${source}::${context ?? ""}::${message}`;
}

/** Record an error into the log. Deduplicates identical errors by bumping a counter. */
export function recordError(
  error: unknown,
  source: ErrorSource = "manual",
  context?: string,
): TrackedError {
  const message = (toText(error) || "Unknown error").slice(0, MAX_MESSAGE);
  const stack = stackOf(error);
  const id = fingerprint(source, message, context);
  const now = Date.now();
  const existing = entries.find((entry) => entry.id === id);

  if (existing) {
    const updated: TrackedError = {
      ...existing,
      count: existing.count + 1,
      lastSeen: now,
      stack: stack ?? existing.stack,
    };
    entries = [updated, ...entries.filter((entry) => entry.id !== id)];
  } else {
    entries = [
      { id, message, stack, source, context, count: 1, firstSeen: now, lastSeen: now },
      ...entries,
    ].slice(0, MAX_ENTRIES);
  }

  persist();
  notify();
  return entries[0];
}

/** Remove a single entry from the log. */
export function dismissError(id: string): void {
  const next = entries.filter((entry) => entry.id !== id);
  if (next.length === entries.length) return;
  entries = next;
  persist();
  notify();
}

/** Clear every tracked error. Returns the number of occurrences removed. */
export function clearErrors(): number {
  const removed = entries.reduce((sum, entry) => sum + entry.count, 0);
  if (entries.length === 0) return removed;
  entries = [];
  persist();
  notify();
  return removed;
}

export function getErrors(): TrackedError[] {
  return entries;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribe to the error log from React components. */
export function useTrackedErrors(): TrackedError[] {
  return useSyncExternalStore(subscribe, getErrors, getErrors);
}

let installed = false;

/**
 * Start capturing errors. Safe to call more than once (and across HMR
 * reloads) — the guard lives on the window object.
 */
export function installErrorTracker(): void {
  if (!isBrowser) return;
  const flag = window as unknown as { __errorTrackerInstalled?: boolean };
  if (installed || flag.__errorTrackerInstalled) {
    installed = true;
    return;
  }
  installed = true;
  flag.__errorTrackerInstalled = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    const target = event.target as Partial<HTMLElement> | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag && ["img", "script", "link", "video", "audio", "source"].includes(tag)) {
      const src = (target as HTMLImageElement)?.src ?? (target as HTMLLinkElement)?.href ?? "";
      recordError(new Error(`Failed to load ${tag}${src ? `: ${src}` : ""}`), "runtime", "resource");
      return;
    }
    recordError(event.error ?? event.message ?? "Uncaught error", "runtime");
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    recordError(event.reason ?? "Unhandled promise rejection", "promise");
  });

  if (typeof console !== "undefined" && typeof console.error === "function") {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      try {
        const [first, ...rest] = args;
        if (first instanceof Error) {
          recordError(first, "console", rest.length ? toText(rest[0]) : undefined);
        } else if (typeof first === "string") {
          const message = [first, ...rest.map(toText)].join(" ");
          recordError(message, "console");
        }
      } catch {
        // Never let the tracker itself throw.
      }
      original(...args);
    };
  }
}
