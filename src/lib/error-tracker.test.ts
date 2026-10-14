import { afterAll, beforeEach, describe, expect, it } from "bun:test";

const STORAGE_KEY = "workspace_error_log_v1";
const globalScope = globalThis as unknown as { window?: unknown };
const originalWindow = globalScope.window;

const store = new Map<string, string>();
globalScope.window = {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  },
};

// Imported after the window stub so the tracker sees a browser-like storage.
const tracker = await import("./error-tracker");

beforeEach(() => {
  tracker.clearErrors();
  store.clear();
});

afterAll(() => {
  tracker.clearErrors();
  globalScope.window = originalWindow;
});

describe("recordError", () => {
  it("records a new error with a single occurrence", () => {
    const entry = tracker.recordError(new Error("boom"), "runtime");
    expect(entry.count).toBe(1);
    expect(entry.source).toBe("runtime");
    expect(entry.message).toBe("boom");
    expect(tracker.getErrors()).toHaveLength(1);
  });

  it("deduplicates repeated errors by bumping the counter", () => {
    tracker.recordError(new Error("boom"), "runtime");
    const second = tracker.recordError(new Error("boom"), "runtime");
    expect(second.count).toBe(2);
    expect(tracker.getErrors()).toHaveLength(1);
  });

  it("keeps the same message from different sources separate", () => {
    tracker.recordError(new Error("boom"), "runtime");
    tracker.recordError(new Error("boom"), "promise");
    expect(tracker.getErrors()).toHaveLength(2);
  });

  it("keeps the same message from different contexts separate", () => {
    tracker.recordError(new Error("boom"), "runtime", "img");
    tracker.recordError(new Error("boom"), "runtime", "script");
    expect(tracker.getErrors()).toHaveLength(2);
  });

  it("handles non-Error values", () => {
    expect(tracker.recordError("plain string").message).toBe("plain string");
    expect(tracker.recordError(null).message).toBe("null");
    expect(tracker.recordError(undefined).message).toBe("undefined");
    expect(tracker.recordError({ a: 1 }).message).toBe('{"a":1}');
  });

  it("truncates very long messages", () => {
    const entry = tracker.recordError("x".repeat(900));
    expect(entry.message.length).toBe(600);
  });

  it("persists the log to storage", () => {
    tracker.recordError(new Error("persisted"), "console");
    const raw = store.get(STORAGE_KEY);
    expect(raw).toBeTypeOf("string");
    expect(JSON.parse(raw ?? "[]")[0].message).toBe("persisted");
  });

  it("caps the log at 120 entries, newest first", () => {
    for (let i = 0; i < 130; i++) tracker.recordError(`unique-${i}`);
    const errors = tracker.getErrors();
    expect(errors).toHaveLength(120);
    expect(errors[0].message).toBe("unique-129");
  });
});

describe("dismissError", () => {
  it("removes only the matching entry", () => {
    const a = tracker.recordError(new Error("a"));
    tracker.recordError(new Error("b"));
    tracker.dismissError(a.id);
    const errors = tracker.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("b");
  });

  it("ignores unknown ids", () => {
    tracker.recordError(new Error("a"));
    tracker.dismissError("not-a-real-id");
    expect(tracker.getErrors()).toHaveLength(1);
  });
});

describe("clearErrors", () => {
  it("returns the number of occurrences removed and empties the log", () => {
    tracker.recordError(new Error("a"));
    tracker.recordError(new Error("b"));
    tracker.recordError(new Error("b"));
    expect(tracker.clearErrors()).toBe(3);
    expect(tracker.getErrors()).toHaveLength(0);
  });

  it("is a no-op on an empty log", () => {
    expect(tracker.clearErrors()).toBe(0);
  });

  it("resets the persisted copy too", () => {
    tracker.recordError(new Error("a"));
    tracker.clearErrors();
    expect(JSON.parse(store.get(STORAGE_KEY) ?? "[]")).toEqual([]);
  });
});

describe("errorSourceLabel", () => {
  it("labels every source", () => {
    expect(tracker.errorSourceLabel("runtime")).toBe("Runtime");
    expect(tracker.errorSourceLabel("promise")).toBe("Promise");
    expect(tracker.errorSourceLabel("console")).toBe("Console");
    expect(tracker.errorSourceLabel("boundary")).toBe("Boundary");
    expect(tracker.errorSourceLabel("manual")).toBe("Reported");
  });
});

describe("subscribe", () => {
  it("notifies subscribers and stops after unsubscribe", () => {
    let calls = 0;
    const unsubscribe = tracker.subscribe(() => {
      calls++;
    });
    tracker.recordError(new Error("a"));
    expect(calls).toBe(1);
    unsubscribe();
    tracker.recordError(new Error("b"));
    expect(calls).toBe(1);
  });
});
