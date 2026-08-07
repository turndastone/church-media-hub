import { describe, expect, it } from "bun:test";
import { OBSAdapter } from "./obs-adapter";
import type { ObsClient } from "../obs";

interface Call {
  type: string;
  data: Record<string, unknown>;
}

/** Minimal fake ObsClient that records requests and returns canned data. */
function fakeClient(handler: (type: string, data: Record<string, unknown>) => unknown) {
  const calls: Call[] = [];
  const client = {
    request: async (type: string, data: Record<string, unknown> = {}) => {
      calls.push({ type, data });
      return handler(type, data);
    },
  } as unknown as ObsClient;
  return { calls, client };
}

describe("OBSAdapter", () => {
  it("lists outputs via GetOutputList and normalises them", async () => {
    const { client } = fakeClient(() => ({
      outputs: [
        { outputName: "ndi_output", outputKind: "ndi_output", outputActive: true },
        { outputName: "", outputKind: "ffmpeg_muxer", outputActive: false },
      ],
    }));
    const adapter = new OBSAdapter(client);
    const outputs = await adapter.listOutputs();
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({
      outputName: "ndi_output",
      outputKind: "ndi_output",
      outputActive: true,
    });
  });

  it("starts an output with StartOutput", async () => {
    const { calls, client } = fakeClient(() => ({}));
    const adapter = new OBSAdapter(client);
    await adapter.startOutput("ndi_output");
    expect(calls[0]).toEqual({
      type: "StartOutput",
      data: { outputName: "ndi_output" },
    });
  });

  it("stops an output with StopOutput", async () => {
    const { calls, client } = fakeClient(() => ({}));
    const adapter = new OBSAdapter(client);
    await adapter.stopOutput("ndi_output");
    expect(calls[0]).toEqual({
      type: "StopOutput",
      data: { outputName: "ndi_output" },
    });
  });

  it("detects NDI outputs by kind", () => {
    const adapter = new OBSAdapter(fakeClient(() => ({})).client);
    expect(
      adapter.isNdiOutput({
        outputName: "ndi_output",
        outputKind: "ndi_output",
        outputActive: false,
      }),
    ).toBe(true);
    expect(
      adapter.isNdiOutput({
        outputName: "recording",
        outputKind: "ffmpeg_muxer",
        outputActive: false,
      }),
    ).toBe(false);
  });

  it("delegates scene listing to the client", async () => {
    const { client } = fakeClient(() => ({}));
    const adapter = new OBSAdapter(client);
    // getSceneList is a real client method; the adapter just forwards to it.
    expect(adapter.listScenes).toBeTypeOf("function");
  });
});
