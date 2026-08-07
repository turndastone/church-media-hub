import { describe, expect, it } from "bun:test";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedPayload,
  keyToBytes,
} from "./crypto";

// 64 hex chars == 32 bytes (built programmatically so it is always valid)
const HEX_KEY = Array.from({ length: 32 }, (_, i) =>
  i.toString(16).padStart(2, "0"),
).join("");

describe("keyToBytes", () => {
  it("parses a 64-char hex key", () => {
    const bytes = keyToBytes(HEX_KEY);
    expect(bytes.length).toBe(32);
    expect(bytes[0]).toBe(0x00);
    expect(bytes[1]).toBe(0x01);
  });

  it("parses a 32-byte base64 key", () => {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
    expect(keyToBytes(b64).length).toBe(32);
  });

  it("rejects keys that are neither hex nor 32-byte base64", () => {
    expect(() => keyToBytes("too-short")).toThrow(/INTEGRATION_CRYPT_KEY/);
  });
});

describe("secret encryption", () => {
  it("round-trips a secret", async () => {
    const payload = await encryptSecret("hunter2-secret", HEX_KEY);
    expect(payload.startsWith("v1.")).toBe(true);
    expect(isEncryptedPayload(payload)).toBe(true);
    expect(await decryptSecret(payload, HEX_KEY)).toBe("hunter2-secret");
  });

  it("produces a different iv each time", async () => {
    const a = await encryptSecret("same", HEX_KEY);
    const b = await encryptSecret("same", HEX_KEY);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong key", async () => {
    const payload = await encryptSecret("secret", HEX_KEY);
    const wrong = "ffff".repeat(16);
    await expect(decryptSecret(payload, wrong)).rejects.toThrow();
  });

  it("rejects malformed payloads", async () => {
    await expect(decryptSecret("not-a-payload", HEX_KEY)).rejects.toThrow(
      /format/i,
    );
    expect(isEncryptedPayload("plaintext")).toBe(false);
    expect(isEncryptedPayload(undefined)).toBe(false);
    expect(isEncryptedPayload(null)).toBe(false);
  });
});
