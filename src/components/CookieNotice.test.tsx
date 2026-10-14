import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import {
  acknowledgeCookieNotice,
  CookieNoticeCard,
  isCookieNoticeAcknowledged,
} from "./CookieNotice";

const STORAGE_KEY = "rccg-cookie-notice-v1";
const globalScope = globalThis as unknown as { window?: unknown };
const originalWindow = globalScope.window;

function stubStorage(options?: { throwing?: boolean }) {
  const store = new Map<string, string>();
  globalScope.window = {
    localStorage: options?.throwing
      ? {
          getItem() {
            throw new Error("storage blocked");
          },
          setItem() {
            throw new Error("storage blocked");
          },
        }
      : {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => void store.set(key, value),
        },
  };
  return store;
}

beforeEach(() => {
  stubStorage();
});

afterEach(() => {
  globalScope.window = originalWindow;
});

describe("cookie notice dismissal", () => {
  it("shows the notice to a first-time visitor", () => {
    expect(isCookieNoticeAcknowledged()).toBe(false);
  });

  it("remembers a dismissal under the published storage key", () => {
    const store = stubStorage();
    acknowledgeCookieNotice();
    expect(store.get(STORAGE_KEY)).toBe("dismissed");
    expect(isCookieNoticeAcknowledged()).toBe(true);
  });

  it("keeps the notice dismissed on return visits", () => {
    const store = stubStorage();
    store.set(STORAGE_KEY, "dismissed");
    expect(isCookieNoticeAcknowledged()).toBe(true);
  });

  it("treats a stored value other than 'dismissed' as not acknowledged", () => {
    const store = stubStorage();
    store.set(STORAGE_KEY, "maybe");
    expect(isCookieNoticeAcknowledged()).toBe(false);
  });

  it("falls back to showing the notice when storage is blocked", () => {
    stubStorage({ throwing: true });
    expect(isCookieNoticeAcknowledged()).toBe(false);
  });

  it("does not throw when dismissal cannot be persisted", () => {
    stubStorage({ throwing: true });
    expect(() => acknowledgeCookieNotice()).not.toThrow();
  });
});

describe("cookie notice banner", () => {
  const html = renderToString(
    <StaticRouter location="/">
      <CookieNoticeCard onDismiss={() => undefined} />
    </StaticRouter>,
  );

  it("links to the privacy policy", () => {
    const links = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.every((href) => href === "/privacy")).toBe(true);
  });

  it("offers a dismiss affordance", () => {
    expect(html).toContain("Got it");
  });

  it("says it only uses essential storage", () => {
    expect(html).toMatch(/essential cookies and local storage/);
    expect(html).toMatch(/no advertising or tracking cookies/);
  });
});
