import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { useObs } from "@/lib/obs";
import { connectorClient, obsAdapter, type ObsOutputInfo } from "@/lib/integrations";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  CircleDot,
  Clapperboard,
  Facebook,
  Link2,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  Plug,
  Power,
  Radio,
  RadioTower,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
  Twitch,
  Unplug,
  Wand2,
  Youtube,
} from "lucide-react";

type StreamTarget = Doc<"streamTargets">;
type StreamPlatform = "youtube" | "facebook" | "twitch" | "vimeo" | "custom";

const PLATFORMS: {
  key: StreamPlatform;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  rtmp: string;
  accent: string;
}[] = [
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    rtmp: "rtmp://a.rtmp.youtube.com/live2",
    accent: "text-red-400",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    rtmp: "rtmps://live-api-s.facebook.com:443/rtmp/",
    accent: "text-blue-400",
  },
  {
    key: "twitch",
    label: "Twitch",
    icon: Twitch,
    rtmp: "rtmp://live.twitch.tv/app",
    accent: "text-purple-400",
  },
  {
    key: "vimeo",
    label: "Vimeo",
    icon: Clapperboard,
    rtmp: "rtmp://live.vimeo.com/app",
    accent: "text-cyan-400",
  },
  {
    key: "custom",
    label: "Custom RTMP",
    icon: RadioTower,
    rtmp: "",
    accent: "text-muted-foreground",
  },
];

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "relative flex h-2 w-2 shrink-0",
        ok ? "text-emerald-400" : "text-muted-foreground/50",
      )}
    >
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          ok ? "bg-emerald-400" : "bg-transparent",
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          ok ? "bg-emerald-400" : "bg-muted-foreground/50",
        )}
      />
    </span>
  );
}

export default function ControlRoom() {
  const obs = useObs();
  const connections = useQuery(api.connections.list);
  const services = useQuery(api.services.list);
  const streamTargets = useQuery(api.streams.list);
  const getSecrets = useAction(api.connections.secrets);
  const upsertTarget = useMutation(api.streams.upsert);
  const removeTarget = useMutation(api.streams.remove);

  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

  // Multi-platform streaming state
  const [streamForm, setStreamForm] = useState<{
    platform: StreamPlatform;
    label: string;
    rtmpUrl: string;
    streamKey: string;
  }>({ platform: "youtube", label: "", rtmpUrl: PLATFORMS[0].rtmp, streamKey: "" });
  const [streamBusy, setStreamBusy] = useState<string | null>(null);

  // Output (NDI) state — real obs-websocket output API.
  const [outputs, setOutputs] = useState<ObsOutputInfo[]>([]);
  const [outputsBusy, setOutputsBusy] = useState(false);

  // Tear down the socket if the operator leaves the console (mount-unmount only).
  const obsRef = useRef(obs);
  obsRef.current = obs;
  useEffect(() => () => obsRef.current.disconnect(), []);

  const activeService = (services ?? []).find((s) => s._id === activeServiceId) ?? null;
  const activeItems = activeService?.items ?? [];
  const currentItem = activeItems[cursor];

  /** Send a command to EasyWorship / PewBeam through the local connector. */
  const sendToConnector = async (
    app: "easyworship" | "pewbeam",
    action: string,
    payload?: Record<string, unknown>,
  ) => {
    const conn = (connections ?? []).find((c) => c.app === app);
    if (!conn?.url) {
      toast.error(
        app === "easyworship"
          ? "Configure the EasyWorship connector first (Integrations → EasyWorship 7)."
          : "Configure the PewBeam connector first (Integrations → PewBeam).",
      );
      return;
    }
    const sec = await getSecrets({ app }).catch(() => ({ password: null, token: null }));
    const res = await connectorClient.send(conn.url, { app, action, payload }, sec.token);
    if (res.ok) {
      toast.success(
        app === "easyworship" ? `EasyWorship → ${action}` : `PewBeam → ${action}`,
      );
    } else {
      toast.error(res.message);
    }
  };

  const sendCurrentTo = async (app: "easyworship" | "pewbeam" | "obs") => {
    if (!currentItem) return;
    if (app === "obs") {
      if (obs.status !== "connected") {
        toast.error("Connect to OBS first");
        return;
      }
      await obs.switchScene(currentItem.label);
      toast.success(`Sent "${currentItem.label}" to OBS`);
    } else {
      await sendToConnector(app, "show", {
        label: currentItem.label,
        type: currentItem.type,
        reference: currentItem.reference ?? null,
        content: currentItem.content ?? null,
      });
    }
  };

  const step = (dir: 1 | -1) => {
    if (activeItems.length === 0) return;
    setCursor((c) => (c + dir + activeItems.length) % activeItems.length);
  };

  // ---- Multi-platform streaming ---------------------------------------------

  const saveTarget = async () => {
    const { platform, label, rtmpUrl, streamKey } = streamForm;
    if (!label.trim() || !rtmpUrl.trim() || !streamKey.trim()) {
      toast.error("Fill in a label, RTMP URL, and stream key");
      return;
    }
    setStreamBusy("save");
    try {
      await upsertTarget({ platform, label, rtmpUrl, streamKey, enabled: true });
      toast.success("Stream target saved");
      setStreamForm({
        platform: "youtube",
        label: "",
        rtmpUrl: PLATFORMS[0].rtmp,
        streamKey: "",
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStreamBusy(null);
    }
  };

  const handleRemoveTarget = async (id: Id<"streamTargets">) => {
    try {
      await removeTarget({ id });
      toast("Stream target removed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const goLive = async (t: StreamTarget) => {
    if (obs.status !== "connected") {
      toast.error("Connect to OBS first");
      return;
    }
    setStreamBusy(t._id);
    try {
      await obs.client.setStreamService(t.rtmpUrl, t.streamKey);
      await obs.client.startStream();
      toast.success(`Streaming to ${t.label}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStreamBusy(null);
    }
  };

  const stopStreaming = async () => {
    if (obs.status !== "connected") {
      toast.error("Connect to OBS first");
      return;
    }
    setStreamBusy("stop");
    try {
      await obs.client.stopStream();
      toast("Stream stopped");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStreamBusy(null);
    }
  };

  // ---- Outputs (NDI) — documented obs-websocket output API ------------------

  const refreshOutputs = async () => {
    if (obs.status !== "connected") {
      toast.error("Connect to OBS first");
      return;
    }
    setOutputsBusy(true);
    try {
      setOutputs(await obsAdapter.listOutputs());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOutputsBusy(false);
    }
  };

  const toggleOutput = async (o: ObsOutputInfo) => {
    if (obs.status !== "connected") {
      toast.error("Connect to OBS first");
      return;
    }
    try {
      if (o.outputActive) {
        await obsAdapter.stopOutput(o.outputName);
        toast(`Output "${o.outputName}" stopped`);
      } else {
        await obsAdapter.startOutput(o.outputName);
        toast.success(`Output "${o.outputName}" started`);
      }
      await refreshOutputs();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Live console"
        title="Control Room"
        description="Drive OBS Studio from a single operator screen, run multi-platform streams, and step the run-of-show. EasyWorship 7 and PewBeam are driven through their local connectors."
      />

      {/* Integrations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="tech-label">Integrations</p>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer gap-1.5 text-muted-foreground"
            onClick={() => (window.location.href = "/dashboard/integrations")}
          >
            <RadioTower className="h-3.5 w-3.5" /> Manage integrations
          </Button>
        </div>
        <IntegrationsPanel compact />
      </section>

      {/* OBS transport + log */}
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <StatusDot ok={obs.status === "connected"} />
              <p className="text-sm font-semibold tracking-tight text-foreground">
                OBS Transport
              </p>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {obs.status}
              </span>
            </div>
            {obs.status === "connected" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={obs.streaming ? "destructive" : "default"}
                  className="cursor-pointer gap-1.5"
                  onClick={obs.toggleStream}
                >
                  {obs.streaming ? (
                    <Square className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {obs.streaming ? "Stop stream" : "Go live"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer gap-1.5"
                  onClick={obs.toggleRecord}
                >
                  {obs.recording ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <CircleDot className="h-3.5 w-3.5" />
                  )}
                  {obs.recording ? "Stop record" : "Record"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={obs.refresh}
                  title="Refresh scenes"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {obs.status === "connected" ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {obs.scenes.length === 0 && (
                  <p className="col-span-full text-xs text-muted-foreground">
                    No scenes returned. Confirm the WebSocket server is enabled
                    in OBS → Tools → WebSocket Server Settings.
                  </p>
                )}
                {obs.scenes.map((name) => (
                  <button
                    key={name}
                    onClick={() => obs.switchScene(name)}
                    className={cn(
                      "cursor-pointer rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                      obs.currentScene === name
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-secondary text-foreground hover:border-primary/40",
                    )}
                  >
                    <span className="block truncate">{name}</span>
                    {obs.currentScene === name && (
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-primary/80">
                        On air
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
                current scene: {obs.currentScene ?? "—"} · scenes are switched
                only while this connection is live
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/40 p-4">
              <p className="text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground">Setup:</span>{" "}
                in OBS Studio open{" "}
                <span className="font-mono">Tools → WebSocket Server Settings</span>,
                enable the server (default port 4455), note the password, then
                connect from the OBS Studio card above.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <p className="tech-label mb-3">Event log</p>
          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-none">
            {obs.log.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Transport events and scene changes will appear here.
              </p>
            ) : (
              obs.log.map((e, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 font-mono text-[11px] leading-4"
                >
                  <span className="shrink-0 text-muted-foreground">{e.time}</span>
                  <span
                    className={cn(
                      e.kind === "ok" && "text-emerald-400/90",
                      e.kind === "error" && "text-destructive/90",
                      e.kind === "info" && "text-foreground/80",
                    )}
                  >
                    {e.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Streaming targets + Outputs */}
      <div className="grid gap-3 lg:grid-cols-5">
        {/* Streaming targets */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Streaming targets
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Save Facebook, YouTube, Twitch, and Vimeo destinations — then go
                live through OBS. Multiple accounts per platform are supported.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  onClick={() =>
                    setStreamForm((f) => ({ ...f, platform: p.key, rtmpUrl: p.rtmp }))
                  }
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    streamForm.platform === p.key
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <p.icon className={cn("h-3 w-3", p.accent)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Input
              value={streamForm.label}
              onChange={(e) => setStreamForm({ ...streamForm, label: e.target.value })}
              placeholder="Label (e.g. Main YouTube)"
              className="text-xs"
            />
            <Input
              value={streamForm.rtmpUrl}
              onChange={(e) => setStreamForm({ ...streamForm, rtmpUrl: e.target.value })}
              placeholder="RTMP URL"
              className="font-mono text-xs"
            />
            <Input
              value={streamForm.streamKey}
              onChange={(e) => setStreamForm({ ...streamForm, streamKey: e.target.value })}
              placeholder="Stream key"
              type="password"
              className="font-mono text-xs sm:col-span-2"
            />
          </div>
          <Button
            size="sm"
            className="mt-2.5 cursor-pointer gap-1.5"
            onClick={saveTarget}
            disabled={streamBusy === "save"}
          >
            {streamBusy === "save" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Save target
          </Button>

          <div className="mt-4 flex flex-col gap-2">
            {!streamTargets ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : streamTargets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                No destinations yet. Add one above, then hit Go live when OBS is
                connected.
              </p>
            ) : (
              streamTargets.map((t) => {
                const meta = PLATFORMS.find((p) => p.key === t.platform) ?? PLATFORMS[4];
                return (
                  <div
                    key={t._id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                  >
                    <meta.icon className={cn("h-4 w-4 shrink-0", meta.accent)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {t.label}
                      </p>
                      <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t.platform} · {t.rtmpUrl}
                      </p>
                    </div>
                    {t.enabled && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-400">
                        Ready
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 cursor-pointer gap-1.5"
                      onClick={() => goLive(t)}
                      disabled={streamBusy !== null}
                    >
                      {streamBusy === t._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      Go live
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveTarget(t._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
            {obs.status === "connected" && (
              <Button
                size="sm"
                variant="destructive"
                className="self-start cursor-pointer gap-1.5"
                onClick={stopStreaming}
                disabled={streamBusy === "stop"}
              >
                {streamBusy === "stop" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
                Stop stream
              </Button>
            )}
          </div>
        </div>

        {/* Outputs (incl. NDI) */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Outputs
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Start/stop OBS outputs — including NDI outputs from the DistroAV
                plugin — via the documented output API.
              </p>
            </div>
            <RadioTower className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={refreshOutputs}
              disabled={outputsBusy || obs.status !== "connected"}
            >
              {outputsBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              List outputs
            </Button>
            {obs.status !== "connected" && (
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Connect to OBS first
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {outputs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                {obs.status === "connected"
                  ? "No outputs found. Create NDI outputs in DistroAV's output settings — they appear here once OBS has them."
                  : "Outputs will be listed here once OBS is connected."}
              </p>
            ) : (
              outputs.map((o) => (
                <div
                  key={o.outputName}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {o.outputName}
                    </p>
                    <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {o.outputKind}
                      {obsAdapter.isNdiOutput(o) ? " · NDI" : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-[0.15em]",
                      o.outputActive ? "text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {o.outputActive ? "Active" : "Stopped"}
                  </span>
                  <Button
                    size="sm"
                    variant={o.outputActive ? "destructive" : "outline"}
                    className="h-7 cursor-pointer gap-1"
                    onClick={() => toggleOutput(o)}
                    disabled={outputsBusy}
                  >
                    {o.outputActive ? (
                      <>
                        <Square className="h-3 w-3" /> Stop
                      </>
                    ) : (
                      <>
                        <Power className="h-3 w-3" /> Start
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
            Install the <span className="font-mono">DistroAV</span> (formerly
            obs-ndi) plugin in OBS and create NDI outputs in its settings; they
            are then controlled here with the standard obs-websocket output
            requests. NDI feeds (e.g. from PewBeam) can be pulled into OBS as
            sources.
          </p>
        </div>
      </div>

      {/* Service drive */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Service drive
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Step through the run-of-show and push each item to your apps.
            </p>
          </div>
          <select
            value={activeServiceId ?? ""}
            onChange={(e) => {
              setActiveServiceId(e.target.value || null);
              setCursor(0);
            }}
            className="cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-ring"
          >
            <option value="">Select a service…</option>
            {(services ?? []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {!activeService ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/40 p-4">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Pick a service to drive it live, or build one in{" "}
              <span className="text-primary">Services</span> first.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-2">
              {activeItems.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                    i === cursor
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-secondary/40",
                  )}
                >
                  <span className="w-5 font-mono text-[10px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {item.label}
                    </p>
                    <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.type}
                      {item.reference ? ` · ${item.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer gap-1 text-[11px]"
                      onClick={() => {
                        setCursor(i);
                        if (obs.status === "connected") {
                          obs.switchScene(item.label);
                          toast.success(`Sent "${item.label}" to OBS`);
                        } else {
                          toast.error("Connect to OBS first");
                        }
                      }}
                    >
                      <MonitorPlay className="h-3 w-3" /> OBS
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer gap-1 text-[11px]"
                      onClick={() =>
                        sendToConnector("easyworship", "show", {
                          label: item.label,
                          type: item.type,
                          reference: item.reference ?? null,
                        })
                      }
                    >
                      <Radio className="h-3 w-3" /> EasyWorship
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer gap-1 text-[11px]"
                      onClick={() =>
                        sendToConnector("pewbeam", "show", {
                          label: item.label,
                          reference: item.reference ?? null,
                        })
                      }
                    >
                      <Wand2 className="h-3 w-3" /> PewBeam
                    </Button>
                  </div>
                </div>
              ))}
              {activeItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This service has no items yet — add content in Services.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => step(-1)}
                disabled={activeItems.length === 0}
              >
                <SkipBack className="h-3.5 w-3.5" /> Previous
              </Button>
              <div className="min-w-0 text-center">
                <p className="truncate text-xs font-semibold text-foreground">
                  {currentItem ? currentItem.label : "—"}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {activeItems.length > 0
                    ? `Item ${cursor + 1} / ${activeItems.length}`
                    : "Empty"}
                </p>
              </div>
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => step(1)}
                disabled={activeItems.length === 0}
              >
                Next <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
