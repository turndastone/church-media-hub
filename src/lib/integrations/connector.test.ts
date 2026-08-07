import { afterEach, describe, expect, it } from "bun:test";
import {
  ConnectorClient,
  normalizeConnectorUrl,
  validateConnectorUrl,
} from "./connector";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {})) as typeof fetch;
}

describe("validateConnectorUrl", () => {
  it("accepts http/https connector URLs", () => {
    expect(validateConnectorUrl("http://192.168.1.20:8810")).toBeNull();
    expect(validateConnectorUrl("https://bridge.example.com")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validateConnectorUrl("")).toMatch(/required|enter/i);
  });

  it("rejects non-http protocols", () => {
    expect(validateConnectorUrl("ftp://host")).toMatch(/http/);
  });

  it("rejects credentials embedded in the URL", () => {
    expect(validateConnectorUrl("http://user:pass@host:8810")).toMatch(
      /credentials|token/,
    );
  });

  it("rejects unparseable input", () => {
    expect(validateConnectorUrl("not a url")).toMatch(/valid url/i);
  });
});

describe("normalizeConnectorUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeConnectorUrl("http://host:8810///")).toBe("http://host:8810");
  });

  it("returns null for invalid URLs", () => {
    expect(normalizeConnectorUrl("ftp://host")).toBeNull();
  });
});

describe("ConnectorClient", () => {
  const client = new ConnectorClient();

  it("pings /health and reports reachable", async () => {
    stubFetch(async (url) => {
      expect(url).toBe("http://bridge:8810/health");
      return new Response(JSON.stringify({ ok: true, app: "pewbeam", version: "1.2.0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const res = await client.ping("http://bridge:8810");
    expect(res.ok).toBe(true);
    expect(res.message).toContain("v1.2.0");
  });

  it("reports non-200 responses as failures", async () => {
    stubFetch(async () => new Response("nope", { status: 404 }));
    const res = await client.ping("http://bridge:8810");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("404");
  });

  it("reports an explicit ok:false health body", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ ok: false }), { status: 200 }),
    );
    const res = await client.ping("http://bridge:8810");
    expect(res.ok).toBe(false);
  });

  it("surfaces network failures with a helpful message", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const res = await client.ping("http://bridge:8810");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/reach|fetch/i);
  });

  it("sends commands to /command with the app/action/payload shape", async () => {
    stubFetch(async (url, init) => {
      expect(url).toBe("http://bridge:8810/command");
      expect(init.method).toBe("POST");
      const body = JSON.parse(String(init.body));
      expect(body).toEqual({
        app: "easyworship",
        action: "show",
        payload: { reference: "John 3:16" },
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const res = await client.send("http://bridge:8810", {
      app: "easyworship",
      action: "show",
      payload: { reference: "John 3:16" },
    });
    expect(res.ok).toBe(true);
  });

  it("forwards the bearer token when provided", async () => {
    stubFetch(async (_url, init) => {
      expect((init.headers as Record<string, string>).Authorization).toBe(
        "Bearer tok123",
      );
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const res = await client.send(
      "http://bridge:8810",
      { app: "pewbeam", action: "advance" },
      "tok123",
    );
    expect(res.ok).toBe(true);
  });

  it("reports the connector's error message on failure", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ ok: false, error: "EasyWorship not running" }), {
        status: 500,
      }),
    );
    const res = await client.send("http://bridge:8810", {
      app: "easyworship",
      action: "show",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("EasyWorship not running");
  });
});
