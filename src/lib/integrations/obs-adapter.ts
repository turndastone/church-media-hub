import { getObsClient, type ObsClient, type ObsStatus } from "../obs";
import type { IntegrationApp, IntegrationState } from "./types";

/**
 * OBS adapter — the only integration with a real, documented API
 * (obs-websocket v5). Everything here maps 1:1 to obs-websocket requests;
 * nothing is simulated. The adapter holds no credentials: the caller fetches
 * the stored (encrypted) password separately and passes it to `connect`.
 */

export interface ObsOutputInfo {
  outputName: string;
  outputKind: string;
  outputActive: boolean;
}

export class OBSAdapter {
  readonly app: IntegrationApp = "obs";

  private readonly client: ObsClient;

  constructor(client: ObsClient = getObsClient()) {
    this.client = client;
  }

  get raw(): ObsClient {
    return this.client;
  }

  get status(): ObsStatus {
    return this.client.status;
  }

  onStatus(fn: (s: ObsStatus) => void): () => void {
    return this.client.onStatus(fn);
  }

  /** Connect to OBS over the documented WebSocket API. */
  async connect(host: string, port: number, password: string): Promise<void> {
    return this.client.connect(`ws://${host}:${port}`, password);
  }

  disconnect(): void {
    this.client.disconnect();
  }

  /** Try a real connection and tear it down; returns the outcome. */
  async testConnection(host: string, port: number, password: string): Promise<{ ok: boolean; message: string }> {
    try {
      await this.connect(host, port, password);
      const scenes = await this.client.getSceneList();
      this.disconnect();
      return {
        ok: true,
        message: `Connected — ${scenes.length} scene${scenes.length === 1 ? "" : "s"} found.`,
      };
    } catch (e) {
      this.disconnect();
      return { ok: false, message: (e as Error).message };
    }
  }

  async listScenes(): Promise<string[]> {
    return this.client.getSceneList();
  }

  async currentScene(): Promise<string | null> {
    return this.client.getCurrentProgramScene();
  }

  async switchScene(sceneName: string): Promise<void> {
    return this.client.setCurrentProgramScene(sceneName);
  }

  /** Real output enumeration (obs-websocket GetOutputList). */
  async listOutputs(): Promise<ObsOutputInfo[]> {
    const data = await this.client.request<{
      outputs?: { outputName?: string; outputKind?: string; outputActive?: boolean }[];
    }>("GetOutputList");
    return (data.outputs ?? [])
      .map((o) => ({
        outputName: o.outputName ?? "",
        outputKind: o.outputKind ?? "",
        outputActive: Boolean(o.outputActive),
      }))
      .filter((o) => o.outputName);
  }

  async startOutput(outputName: string): Promise<void> {
    return this.client.request("StartOutput", { outputName });
  }

  async stopOutput(outputName: string): Promise<void> {
    return this.client.request("StopOutput", { outputName });
  }

  /** Best-effort guess that an output is an NDI output (DistroAV kind). */
  isNdiOutput(output: ObsOutputInfo): boolean {
    return output.outputKind.toLowerCase().includes("ndi");
  }
}

/** Shared adapter for the whole app (single socket, many subscribers). */
export const obsAdapter = new OBSAdapter();
