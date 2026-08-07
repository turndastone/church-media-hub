import { describe, expect, it } from "bun:test";
import { deriveStatus, statusTone, type StatusInput } from "./status";

const base: StatusInput = {
  app: "obs",
  configured: false,
  enabled: true,
  live: false,
  busy: false,
};

describe("deriveStatus", () => {
  it("reports disabled before anything else", () => {
    const s = deriveStatus({ ...base, enabled: false, live: true });
    expect(s.status).toBe("disconnected");
    expect(s.disabled).toBe(true);
    expect(s.message).toMatch(/disable/i);
  });

  it("reports connecting while busy", () => {
    const s = deriveStatus({ ...base, configured: true, busy: true });
    expect(s.status).toBe("connecting");
  });

  it("reports connected when live", () => {
    const s = deriveStatus({ ...base, configured: true, live: true });
    expect(s.status).toBe("connected");
    expect(s.lastConnectedAt).toBeTypeOf("number");
  });

  it("prioritises errors over unconfigured", () => {
    const s = deriveStatus({ ...base, configured: true, error: "boom" });
    expect(s.status).toBe("error");
    expect(s.message).toBe("boom");
  });

  it("shows unavailable for an unconfigured OBS", () => {
    const s = deriveStatus({ ...base, app: "obs" });
    expect(s.status).toBe("unavailable");
  });

  it("shows requires_connector for unconfigured EasyWorship/PewBeam", () => {
    const s = deriveStatus({ ...base, app: "easyworship" });
    expect(s.status).toBe("requires_connector");
  });

  it("shows disconnected once configured but not live", () => {
    const s = deriveStatus({ ...base, app: "pewbeam", configured: true });
    expect(s.status).toBe("disconnected");
    expect(s.message).toMatch(/not connected/i);
  });
});

describe("statusTone", () => {
  it("maps connected to ok", () => expect(statusTone("connected")).toBe("ok"));
  it("maps connecting to warn", () => expect(statusTone("connecting")).toBe("warn"));
  it("maps error to err", () => expect(statusTone("error")).toBe("err"));
  it("maps everything else to muted", () => {
    expect(statusTone("unavailable")).toBe("muted");
    expect(statusTone("requires_connector")).toBe("muted");
    expect(statusTone("disconnected")).toBe("muted");
  });
});
