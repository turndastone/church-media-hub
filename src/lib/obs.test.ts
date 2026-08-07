import { afterEach, describe, expect, it } from "bun:test";
import { ObsClient } from "./obs";

// Ground-truth auth vectors computed independently from the obs-websocket v5
// protocol (secret = b64(sha256(password + b64(sha256(challenge + salt)))),
// auth = b64(sha256(secret + challenge))).
const AUTH_VECTOR = "6eihAp4hp8W/r0cF94d8LMZcTdH2fNejHzaykpDZvbA=";
const AUTH_VECTOR_EMPTY_PW = "1MZOC1kVIEaxK1W3Q91yZRGXZFVji9icoWhWheR7WM0=";
// Legacy base64 variant (auth = b64(sha256(b64(sha256(password + salt)) + challenge))).
const AUTH_VECTOR_BASE64 = "55b/ngFuBawhoZNFVJ18MyScrZBFjF4c2qdkqEPy0P0=";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }

  // Test helpers
  open() {
    this.onopen?.();
  }
  serverMessage(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
  fail() {
    this.onerror?.();
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

FakeWebSocket.instances = [];
(globalThis as unknown as { WebSocket: typeof FakeWebSocket }).WebSocket =
  FakeWebSocket;
afterEach(() => {
  FakeWebSocket.instances = [];
});

describe("ObsClient handshake", () => {
  it("identifies without authentication when the server sends no challenge", async () => {
    const client = new ObsClient();
    const connected = client.connect("ws://localhost:4455");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.serverMessage({ op: 0, d: { rpcVersion: 1 } });
    await tick();

    const identify = JSON.parse(ws.sent[0]);
    expect(identify.op).toBe(1);
    expect(identify.d).toEqual({ rpcVersion: 1 });

    ws.serverMessage({ op: 2, d: { negotiatedRpcVersion: 1 } });
    await connected;
    expect(client.status).toBe("connected");
  });

  it("computes the correct auth secret (with password)", async () => {
    const client = new ObsClient();
    const connected = client.connect("ws://localhost:4455", "hunter2");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.serverMessage({
      op: 0,
      d: {
        rpcVersion: 1,
        authentication: {
          challenge: "challengeXYZ",
          salt: "salty123",
          authenticationMethod: "SHA256",
        },
      },
    });
    await tick();

    const identify = JSON.parse(ws.sent[0]);
    expect(identify.op).toBe(1);
    expect(identify.d.authentication).toBe(AUTH_VECTOR);

    ws.serverMessage({ op: 2, d: {} });
    await connected;
  });

  it("computes the correct auth secret with an empty password", async () => {
    const client = new ObsClient();
    const connected = client.connect("ws://localhost:4455", "");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.serverMessage({
      op: 0,
      d: {
        rpcVersion: 1,
        authentication: {
          challenge: "c2",
          salt: "s9",
          authenticationMethod: "SHA256",
        },
      },
    });
    await tick();

    const identify = JSON.parse(ws.sent[0]);
    expect(identify.d.authentication).toBe(AUTH_VECTOR_EMPTY_PW);

    ws.serverMessage({ op: 2, d: {} });
    await connected;
  });

  it("uses the legacy base64 algorithm when the server requests it", async () => {
    const client = new ObsClient();
    const connected = client.connect("ws://localhost:4455", "hunter2");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.serverMessage({
      op: 0,
      d: {
        rpcVersion: 1,
        authentication: {
          challenge: "challengeXYZ",
          salt: "salty123",
          authenticationMethod: "base64",
        },
      },
    });
    await tick();

    const identify = JSON.parse(ws.sent[0]);
    expect(identify.d.authentication).toBe(AUTH_VECTOR_BASE64);

    ws.serverMessage({ op: 2, d: {} });
    await connected;
  });

  it("rejects the connection promise on a websocket error", async () => {
    const client = new ObsClient();
    const connected = client.connect("ws://localhost:4455");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.fail();
    await expect(connected).rejects.toThrow(/WebSocket error/);
    expect(client.status).toBe("error");
  });
});

describe("ObsClient requests and events", () => {
  async function connectedClient() {
    const client = new ObsClient();
    const connected = client.connect("ws://localhost:4455");
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.serverMessage({ op: 0, d: { rpcVersion: 1 } });
    ws.serverMessage({ op: 2, d: {} });
    await connected;
    return { client, ws };
  }

  it("round-trips a request and resolves with response data", async () => {
    const { client, ws } = await connectedClient();
    const req = client.request<{ scenes: { sceneName: string }[] }>(
      "GetSceneList",
    );
    const sent = JSON.parse(ws.sent[1]);
    expect(sent.op).toBe(4);
    expect(sent.d.requestType).toBe("GetSceneList");

    ws.serverMessage({
      op: 5,
      d: {
        requestType: "GetSceneList",
        requestId: sent.d.requestId,
        requestStatus: { result: true },
        responseData: { scenes: [{ sceneName: "Worship" }] },
      },
    });
    const res = await req;
    expect(res.scenes?.[0]?.sceneName).toBe("Worship");
  });

  it("rejects when OBS reports a failed request", async () => {
    const { client, ws } = await connectedClient();
    const req = client.request("StartStream");
    const sent = JSON.parse(ws.sent[1]);
    ws.serverMessage({
      op: 5,
      d: {
        requestType: "StartStream",
        requestId: sent.d.requestId,
        requestStatus: { result: false, code: 100, comment: "Stream already active" },
      },
    });
    await expect(req).rejects.toThrow(/Stream already active/);
  });

  it("emits typed events to registered listeners", async () => {
    const { client, ws } = await connectedClient();
    const seen: Record<string, unknown>[] = [];
    const off = client.on("CurrentProgramSceneChanged", (d) => seen.push(d));

    ws.serverMessage({
      op: 8,
      d: { eventType: "CurrentProgramSceneChanged", eventData: { sceneName: "Pre-Service" } },
    });
    await tick();
    expect(seen).toHaveLength(1);
    expect(seen[0].sceneName).toBe("Pre-Service");

    off();
    ws.serverMessage({
      op: 8,
      d: { eventType: "CurrentProgramSceneChanged", eventData: { sceneName: "Sermon" } },
    });
    await tick();
    expect(seen).toHaveLength(1);
  });

  it("rejects requests made before connecting", async () => {
    const client = new ObsClient();
    await expect(client.request("GetSceneList")).rejects.toThrow(
      /Not connected to OBS/,
    );
  });
});
