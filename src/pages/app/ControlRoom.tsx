import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { useObs } from "@/lib/obs";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Cable,
  CircleDot,
  Link2,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  Plug,
  Radio,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
  Unplug,
  Wand2,
} from "lucide-react";

type Connection = Doc<"connections">;

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
  const upsert = useMutation(api.connections.upsert);
  const touch = useMutation(api.connections.touch);

  const [obsForm, setObsForm] = useState({ host: "localhost", port: "4455", password: "" });
  const [ewForm, setEwForm] = useState({ url: "", token: "" });
  const [pbForm, setPbForm] = useState({ url: "", token: "" });
  const [connecting, setConnecting] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!connections) return;
    const byApp = new Map(connections.map((c) => [c.app, c]));
    const obsC = byApp.get("obs");
    const ewC = byApp.get("easyworship");
    const pbC = byApp.get("pewbeam");
    if (obsC) setObsForm({ host: obsC.host || "localhost", port: String(obsC.port ?? 4455), password: obsC.password ?? "" });
    if (ewC) setEwForm({ url: ewC.url ?? "", token: ewC.token ?? "" });
    if (pbC) setPbForm({ url: pbC.url ?? "", token: pbC.token ?? "" });
  }, [connections]);

  // Tear down the socket if the operator leaves the console (mount-unmount only).
  const obsRef = useRef(obs);
  obsRef.current = obs;
  useEffect(() => () => obsRef.current.disconnect(), []);

  const activeService = (services ?? []).find((s) => s._id === activeServiceId) ?? null;
  const activeItems = activeService?.items ?? [];
  const currentItem = activeItems[cursor];

  const handleConnectObs = async () => {
    const url = `ws://${obsForm.host}:${obsForm.port}`;
    setConnecting(true);
    try {
      await upsert({
        app: "obs",
        host: obsForm.host,
        port: parseInt(obsForm.port, 10) || 4455,
        password: obsForm.password,
        enabled: true,
      });
      await obs.connect(url, obsForm.password);
      touch({ app: "obs" }).catch(() => undefined);
      toast.success("Connected to OBS Studio");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectObs = () => {
    obs.disconnect();
    toast("Disconnected from OBS");
  };

  const saveBridge = async (app: "easyworship" | "pewbeam", form: { url: string; token: string }) => {
    try {
      await upsert({ app, url: form.url, token: form.token, enabled: !!form.url });
      toast.success(
        app === "easyworship" ? "EasyWorship bridge saved" : "Pewbeam bridge saved",
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sendBridge = async (app: "easyworship" | "pewbeam", action: string, payload?: Record<string, unknown>) => {
    const conn = (connections ?? []).find((c) => c.app === app);
    if (!conn?.url) {
      toast.error(
        app === "easyworship"
          ? "Configure the EasyWorship bridge URL first (e.g. your Bitfocus Companion endpoint)."
          : "Configure the Pewbeam HTTP hook URL first.",
      );
      return;
    }
    setBridgeBusy(`${app}:${action}`);
    try {
      const res = await fetch(conn.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(conn.token ? { Authorization: `Bearer ${conn.token}` } : {}),
        },
        body: JSON.stringify({ action, token: conn.token ?? null, payload: payload ?? {} }),
      });
      if (!res.ok) throw new Error(`Bridge responded ${res.status}`);
      toast.success(
        app === "easyworship"
          ? `EasyWorship → ${action}`
          : `Pewbeam → ${action}`,
      );
    } catch (e) {
      toast.error(`Bridge request failed: ${(e as Error).message}`);
    } finally {
      setBridgeBusy(null);
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
      await sendBridge(app, "show", {
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

  const connectionCard = (
    title: string,
    icon: React.ReactNode,
    configured: boolean,
    body: React.ReactNode,
    footer?: React.ReactNode,
  ) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {configured ? "Configured" : "Not configured"}
            </p>
          </div>
        </div>
        <StatusDot ok={configured} />
      </div>
      <div className="mt-4 space-y-2.5">{body}</div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Live console"
        title="Control Room"
        description="Drive OBS Studio, EasyWorship 7, and Pewbeam from a single operator screen. Connections run over your local network."
      />

      {/* Connection cards */}
      <div className="grid gap-3 lg:grid-cols-3">
        {connectionCard(
          "OBS Studio",
          <MonitorPlay className="h-4 w-4 text-primary" />,
          !!connections?.find((c) => c.app === "obs")?.enabled,
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                value={obsForm.host}
                onChange={(e) => setObsForm({ ...obsForm, host: e.target.value })}
                placeholder="host"
                className="font-mono text-xs"
              />
              <Input
                value={obsForm.port}
                onChange={(e) => setObsForm({ ...obsForm, port: e.target.value })}
                placeholder="4455"
                className="font-mono text-xs"
              />
            </div>
            <Input
              value={obsForm.password}
              onChange={(e) => setObsForm({ ...obsForm, password: e.target.value })}
              placeholder="WebSocket password (optional)"
              type="password"
              className="font-mono text-xs"
            />
          </>,
          obs.status === "connected" ? (
            <Button
              variant="outline"
              className="w-full cursor-pointer gap-1.5"
              onClick={handleDisconnectObs}
            >
              <Unplug className="h-4 w-4" /> Disconnect
            </Button>
          ) : (
            <Button
              className="w-full cursor-pointer gap-1.5"
              onClick={handleConnectObs}
              disabled={connecting}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              {obs.status === "connecting"
                ? "Connecting…"
                : obs.status === "error"
                  ? "Retry connection"
                  : "Connect to OBS"}
            </Button>
          ),
        )}

        {connectionCard(
          "EasyWorship 7",
          <Radio className="h-4 w-4 text-accent" />,
          !!connections?.find((c) => c.app === "easyworship")?.enabled,
          <>
            <Input
              value={ewForm.url}
              onChange={(e) => setEwForm({ ...ewForm, url: e.target.value })}
              placeholder="Bridge URL (e.g. http://192.168.1.20:8000/api)"
              className="font-mono text-xs"
            />
            <Input
              value={ewForm.token}
              onChange={(e) => setEwForm({ ...ewForm, token: e.target.value })}
              placeholder="Remote token (optional)"
              className="font-mono text-xs"
            />
            <p className="text-[11px] leading-4 text-muted-foreground">
              Point this at a local automation bridge such as Bitfocus
              Companion, or an EasyWorship remote helper, to trigger slides.
            </p>
          </>,
          <Button
            variant="outline"
            className="w-full cursor-pointer gap-1.5"
            onClick={() => saveBridge("easyworship", ewForm)}
          >
            <Cable className="h-4 w-4" /> Save bridge
          </Button>,
        )}

        {connectionCard(
          "Pewbeam",
          <Wand2 className="h-4 w-4 text-cyan-400" />,
          !!connections?.find((c) => c.app === "pewbeam")?.enabled,
          <>
            <Input
              value={pbForm.url}
              onChange={(e) => setPbForm({ ...pbForm, url: e.target.value })}
              placeholder="HTTP hook URL (local Pewbeam endpoint)"
              className="font-mono text-xs"
            />
            <Input
              value={pbForm.token}
              onChange={(e) => setPbForm({ ...pbForm, token: e.target.value })}
              placeholder="API key (optional)"
              className="font-mono text-xs"
            />
            <p className="text-[11px] leading-4 text-muted-foreground">
              Pewbeam exposes HTTP control hooks — send scripture displays here,
              or pull its NDI output into OBS for lower-thirds.
            </p>
          </>,
          <Button
            variant="outline"
            className="w-full cursor-pointer gap-1.5"
            onClick={() => saveBridge("pewbeam", pbForm)}
          >
            <Cable className="h-4 w-4" /> Save hook
          </Button>,
        )}
      </div>

      {/* OBS panel + log */}
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
                ws://{obsForm.host}:{obsForm.port} · current:{" "}
                {obs.currentScene ?? "—"}
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/40 p-4">
              <p className="text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground">Setup:</span>{" "}
                in OBS Studio open <span className="font-mono">Tools → WebSocket Server Settings</span>,
                enable the server (default port 4455), note the password, then
                connect above. The browser talks to OBS over WebSocket on your
                local network.
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
                      onClick={() => sendBridge("easyworship", "show", {
                        label: item.label,
                        type: item.type,
                        reference: item.reference ?? null,
                      })}
                      disabled={bridgeBusy !== null}
                    >
                      <Radio className="h-3 w-3" /> EasyWorship
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer gap-1 text-[11px]"
                      onClick={() => sendBridge("pewbeam", "show", {
                        label: item.label,
                        reference: item.reference ?? null,
                      })}
                      disabled={bridgeBusy !== null}
                    >
                      <Wand2 className="h-3 w-3" /> Pewbeam
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
