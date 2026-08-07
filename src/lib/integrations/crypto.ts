/**
 * AES-256-GCM encryption for connection secrets (OBS websocket password,
 * connector tokens) stored at rest in the database.
 *
 * Uses WebCrypto (`crypto.subtle`), which is available in the browser, the
 * Convex node runtime, and Bun's test runner. The key is provided by the
 * operator via the `INTEGRATION_CRYPT_KEY` environment variable (32-byte hex
 * or base64) — never hard-coded and never shipped to the client.
 *
 * Payload format: `v1.<ivBase64>.<ciphertextBase64>`
 */

const ALGORITHM = "AES-GCM";
const IV_BYTES = 12;

function b64Encode(bytes: Uint8Array<ArrayBuffer>): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64Decode(value: string): Uint8Array<ArrayBuffer> {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Normalize a hex (64 chars) or base64 key into raw bytes. */
export function keyToBytes(key: string): Uint8Array<ArrayBuffer> {
  const trimmed = key.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  let decoded: Uint8Array<ArrayBuffer>;
  try {
    decoded = b64Decode(trimmed);
  } catch {
    throw new Error(
      "INTEGRATION_CRYPT_KEY must be a 64-char hex string or 32-byte base64 value.",
    );
  }
  if (decoded.length !== 32) {
    throw new Error(
      "INTEGRATION_CRYPT_KEY must be a 64-char hex string or 32-byte base64 value.",
    );
  }
  return decoded;
}

export async function encryptSecret(plaintext: string, keyHexOrB64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyToBytes(keyHexOrB64),
    { name: ALGORITHM },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `v1.${b64Encode(iv)}.${b64Encode(new Uint8Array<ArrayBuffer>(ciphertext))}`;
}

export async function decryptSecret(payload: string, keyHexOrB64: string): Promise<string> {
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("Unsupported secret payload format.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyToBytes(keyHexOrB64),
    { name: ALGORITHM },
    false,
    ["decrypt"],
  );
  const iv = b64Decode(parts[1]);
  const ciphertext = b64Decode(parts[2]);
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

/** True when the stored payload looks like one of ours (safe to decrypt). */
export function isEncryptedPayload(value: string | undefined | null): value is string {
  return typeof value === "string" && value.startsWith("v1.");
}
