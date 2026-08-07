import { useCallback, useEffect, useRef, useState } from "react";

export type ObsStatus = "idle" | "connecting" | "connected" | "error";

type ObsMessage = {
  op: number;
  d?: {
    rpcVersion?: number;
    authentication?: {
      challenge?: string;
      salt?: string;
      authenticationMethod?: string;
    };
    requestType?: string;
    requestId?: number;
    requestStatus?: { result: boolean; code?: number; comment?: string };
    responseData?: Record<string, unknown>;
    eventType?: string;
    eventData?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

export type ObsEventCallback = (data: Record<string, unknown>) => void;

const OP = {
  Hello: 0,
  Identify: 1,
  Identified: 2,
  Request: 4,
  RequestResponse: 5,
  Event: 8,
} as const;

export class ObsClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private listeners = new Map<string, Set<ObsEventCallback>>();
  private statusListeners = new Set<(s: ObsStatus) => void>();
  private connectResolve: (() => void) | null = null;
  private connectReject: ((e: Error) => void) | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  status: ObsStatus = "idle";

  onStatus(fn: (s: ObsStatus) => void) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  on(event: string, fn: ObsEventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  private setStatus(s: ObsStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  private emit(event: string, data: Record<string, unknown>) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  private b64FromBytes(bytes: Uint8Array) {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }

  private async sha256(data: string) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(data),
    );
    return new Uint8Array(buf);
  }

  private async authString(
    password: string,
    auth: NonNullable<ObsMessage["d"]>["authentication"],
  ) {
    const challenge = auth?.challenge ?? "";
    const salt = auth?.salt ?? "";
    // obs-websocket v5 sends authenticationMethod: "SHA256" (default) or
    // "base64" (legacy v4 compat). Default to SHA256 when absent.
    const method = auth?.authenticationMethod ?? "SHA256";
    if (method === "SHA256") {
      const hashOfChallengeSalt = await this.sha256(challenge + salt);
      const secret = this.b64FromBytes(hashOfChallengeSalt);
      const secret2 = await this.sha256(password + secret);
      const auth2 = await this.sha256(this.b64FromBytes(secret2) + challenge);
      return this.b64FromBytes(auth2);
    }
    const secret = await this.sha256(password + salt);
    const auth2 = await this.sha256(this.b64FromBytes(secret) + challenge);
    return this.b64FromBytes(auth2);
  }

  async connect(url: string, password?: string): Promise<void> {
    if (this.ws && this.status === "connected") return;
    if (password !== undefined) this.authPassword = password;
    this.setStatus("connecting");
    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        this.setStatus("error");
        reject(e as Error);
        return;
      }
      this.ws = ws;
      this.connectTimer = setTimeout(() => {
        this.fail(new Error("Connection timed out. Is OBS running with the WebSocket server enabled?"));
      }, 8000);

      ws.onopen = () => {
        // Wait for Hello before identifying.
      };
      ws.onmessage = (ev) => {
        this.handleMessage(ev.data as string).catch((e) => this.fail(e));
      };
      ws.onerror = () => {
        this.fail(new Error("WebSocket error — check host, port, and OBS WebSocket settings."));
      };
      ws.onclose = () => {
        if (this.status === "connected") this.setStatus("idle");
        else this.fail(new Error("Connection closed before identifying."));
      };
    });
  }

  private fail(e: Error) {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.setStatus("error");
    if (this.connectReject) this.connectReject(e);
    this.connectReject = null;
    this.connectResolve = null;
  }

  private async handleMessage(raw: string) {
    const msg = JSON.parse(raw) as ObsMessage;
    if (msg.op === OP.Hello) {
      const d = msg.d ?? {};
      const payload: Record<string, unknown> = { rpcVersion: 1 };
      if (d.authentication?.challenge) {
        const auth = await this.authString(this.authPassword ?? "", d.authentication);
        payload.authentication = auth;
      }
      this.ws?.send(JSON.stringify({ op: OP.Identify, d: payload }));
    } else if (msg.op === OP.Identified) {
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.setStatus("connected");
      this.connectResolve?.();
      this.connectResolve = null;
      this.connectReject = null;
    } else if (msg.op === OP.RequestResponse) {
      const d = msg.d ?? {};
      if (typeof d.requestId === "number") {
        const entry = this.pending.get(d.requestId);
        if (entry) {
          this.pending.delete(d.requestId);
          if (d.requestStatus?.result) {
            entry.resolve(d.responseData ?? {});
          } else {
            entry.reject(
              new Error(
                `OBS ${d.requestType ?? "request"} failed: ${d.requestStatus?.comment ?? d.requestStatus?.code ?? "unknown error"}`,
              ),
            );
          }
        }
      }
    } else if (msg.op === OP.Event) {
      const d = msg.d ?? {};
      if (d.eventType) this.emit(d.eventType, d.eventData ?? {});
    }
  }

  authPassword = "";

  request<T = Record<string, unknown>>(
    requestType: string,
    requestData: Record<string, unknown> = {},
  ): Promise<T> {
    if (!this.ws || this.status !== "connected") {
      return Promise.reject(new Error("Not connected to OBS"));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws?.send(
        JSON.stringify({ op: OP.Request, d: { requestType, requestId: id, requestData } }),
      );
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`OBS request timed out: ${requestType}`));
        }
      }, 7000);
    });
  }

  disconnect() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.ws?.close();
    this.ws = null;
    this.setStatus("idle");
  }

  // ---- High-level helpers ------------------------------------------------

  async getSceneList(): Promise<string[]> {
    const data = await this.request<{ scenes?: { sceneName?: string }[] }>(
      "GetSceneList",
    );
    return (data.scenes ?? []).map((s) => s.sceneName ?? "").filter(Boolean);
  }

  async getCurrentProgramScene(): Promise<string | null> {
    const data = await this.request<{ currentProgramSceneName?: string }>(
      "GetCurrentProgramScene",
    );
    return data.currentProgramSceneName ?? null;
  }

  async setCurrentProgramScene(sceneName: string) {
    await this.request("SetCurrentProgramScene", { sceneName });
  }

  async startStream() {
    await this.request("StartStream");
  }

  async stopStream() {
    await this.request("StopStream");
  }

  async startRecord() {
    await this.request("StartRecord");
  }

  async stopRecord() {
    await this.request("StopRecord");
  }

  async getStreamStatus() {
    return await this.request<{
      outputActive?: boolean;
      outputReconnecting?: boolean;
      outputDuration?: number;
      bytesSent?: number;
      kbitsPerSec?: number;
    }>("GetStreamStatus");
  }

  async getRecordStatus() {
    return await this.request<{ outputActive?: boolean }>("GetRecordStatus");
  }
}

export interface ObsLogEntry {
  time: string;
  msg: string;
  kind: "ok" | "error" | "info";
}

/** React binding around ObsClient — one connection per component tree. */
export function useObs() {
  const clientRef = useRef<ObsClient | null>(null);
  if (!clientRef.current) clientRef.current = new ObsClient();
  const client = clientRef.current;

  const [status, setStatus] = useState<ObsStatus>("idle");
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  const [scenes, setScenes] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [log, setLog] = useState<ObsLogEntry[]>([]);

  const pushLog = useCallback((msg: string, kind: ObsLogEntry["kind"] = "info") => {
    setLog((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          msg,
          kind,
        },
      ].slice(-60),
    );
  }, []);

  const refresh = useCallback(async () => {
    if (client.status !== "connected") return;
    try {
      const [sceneList, cur] = await Promise.all([
        client.getSceneList(),
        client.getCurrentProgramScene(),
      ]);
      setScenes(sceneList);
      setCurrentScene(cur);
    } catch (e) {
      pushLog((e as Error).message, "error");
    }
  }, [client, pushLog]);

  useEffect(() => {
    const unStatus = client.onStatus((s) => {
      setStatus(s);
      if (s === "connected") {
        refresh();
      } else if (s === "idle") {
        setScenes([]);
        setCurrentScene(null);
        setStreaming(false);
        setRecording(false);
      }
    });
    const unScene = client.on("CurrentProgramSceneChanged", (d) => {
      const name = d.sceneName as string | undefined;
      if (name) {
        setCurrentScene(name);
        pushLog(`Scene → ${name}`, "ok");
      }
    });
    const unStream = client.on("StreamStateChanged", (d) => {
      const state = String(d.outputState ?? "");
      setStreaming(state === "OBS_WEBSOCKET_OUTPUT_STARTED" || state === "OBS_WEBSOCKET_OUTPUT_STARTING");
      if (state === "OBS_WEBSOCKET_OUTPUT_STARTED") pushLog("Stream started", "ok");
      if (state === "OBS_WEBSOCKET_OUTPUT_STOPPED") pushLog("Stream stopped", "info");
    });
    const unRecord = client.on("RecordStateChanged", (d) => {
      const state = String(d.outputState ?? "");
      setRecording(state === "OBS_WEBSOCKET_OUTPUT_STARTED" || state === "OBS_WEBSOCKET_OUTPUT_STARTING");
      if (state === "OBS_WEBSOCKET_OUTPUT_STARTED") pushLog("Recording started", "ok");
      if (state === "OBS_WEBSOCKET_OUTPUT_STOPPED") pushLog("Recording stopped", "info");
    });
    return () => {
      unStatus();
      unScene();
      unStream();
      unRecord();
    };
  }, [client, pushLog, refresh]);

  const connect = useCallback(
    async (url: string, password: string) => {
      client.authPassword = password;
      pushLog(`Connecting to ${url}…`, "info");
      try {
        await client.connect(url, password);
        pushLog("Connected to OBS", "ok");
        await refresh();
      } catch (e) {
        pushLog((e as Error).message, "error");
        throw e;
      }
    },
    [client, pushLog, refresh],
  );

  const disconnect = useCallback(() => {
    pushLog("Disconnected from OBS", "info");
    client.disconnect();
  }, [client, pushLog]);

  const switchScene = useCallback(
    async (name: string) => {
      try {
        await client.setCurrentProgramScene(name);
        setCurrentScene(name);
        pushLog(`Scene → ${name}`, "ok");
      } catch (e) {
        pushLog((e as Error).message, "error");
      }
    },
    [client, pushLog],
  );

  const toggleStream = useCallback(async () => {
    try {
      if (streaming) {
        await client.stopStream();
        setStreaming(false);
        pushLog("Stopping stream…", "info");
      } else {
        await client.startStream();
        setStreaming(true);
        pushLog("Starting stream…", "ok");
      }
    } catch (e) {
      pushLog((e as Error).message, "error");
    }
  }, [client, streaming, pushLog]);

  const toggleRecord = useCallback(async () => {
    try {
      if (recording) {
        await client.stopRecord();
        setRecording(false);
        pushLog("Stopping recording…", "info");
      } else {
        await client.startRecord();
        setRecording(true);
        pushLog("Starting recording…", "ok");
      }
    } catch (e) {
      pushLog((e as Error).message, "error");
    }
  }, [client, recording, pushLog]);

  return {
    client,
    status,
    currentScene,
    scenes,
    streaming,
    recording,
    log,
    connect,
    disconnect,
    switchScene,
    toggleStream,
    toggleRecord,
    refresh,
    pushLog,
  };
}
