import { describe, expect, it } from "bun:test";
import { resolveRedirectAfterAuth } from "./Auth";

describe("resolveRedirectAfterAuth", () => {
  it("defaults to the member dashboard", () => {
    expect(resolveRedirectAfterAuth(null)).toBe("/dashboard");
    expect(resolveRedirectAfterAuth(null, "/dashboard")).toBe("/dashboard");
  });

  it("preserves the protected page the member asked for", () => {
    expect(resolveRedirectAfterAuth("/dashboard/testimonies")).toBe(
      "/dashboard/testimonies",
    );
    expect(resolveRedirectAfterAuth("/dashboard/catalog/abc123")).toBe(
      "/dashboard/catalog/abc123",
    );
  });

  it("keeps the query string of the requested page", () => {
    expect(resolveRedirectAfterAuth("/dashboard/catalog?type=song")).toBe(
      "/dashboard/catalog?type=song",
    );
  });

  it("rejects protocol-relative off-site redirects", () => {
    expect(resolveRedirectAfterAuth("//evil.example.com")).toBe("/dashboard");
  });

  it("rejects absolute off-site redirects", () => {
    expect(resolveRedirectAfterAuth("https://evil.example.com")).toBe(
      "/dashboard",
    );
    expect(resolveRedirectAfterAuth("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back for empty or relative returnTo values", () => {
    expect(resolveRedirectAfterAuth("")).toBe("/dashboard");
    expect(resolveRedirectAfterAuth("dashboard/testimonies")).toBe("/dashboard");
  });

  it("honours a caller-provided fallback", () => {
    expect(resolveRedirectAfterAuth(null, "/dashboard/testimonies")).toBe(
      "/dashboard/testimonies",
    );
  });
});
