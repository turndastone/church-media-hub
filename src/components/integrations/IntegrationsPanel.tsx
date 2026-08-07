import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { SafeConnection } from "@/convex/connections";
import { useObs } from "@/lib/obs";
import {
  connectorClient,
  deriveStatus,
  obsAdapter,
  type IntegrationApp,
  type IntegrationState,
} from "@/lib/integrations";
import { IntegrationCard } from "./IntegrationCard";
import { MonitorPlay, Radio, Wand2 } from "lucide-react";

interface Note {
  ok: boolean;
  message: string;
}

export const INTEGRATION_META = {
  obs: {
    name: "OBS Studio",
    tagline: "Broadcast & projection engine — direct WebSocket connection.",
    icon: MonitorPlay,
    footnote:
      "OBS exposes the documented obs-websocket v5 API (Tools → WebSocket Server Settings). A cloud-hosted app can only reach OBS when it's served on the same network; otherwise route through the local connector.",
  },
  easyworship: {
    name: "EasyWorship 7",
    tagline: "Song & presentation library — no public web API.",
    icon: Radio,
    footnote:
      "EasyWorship 7 has no public API for web apps. The supported integration point is the Alpha Worship Bridge local connector — a small companion app on the media PC that bridges commands to EasyWorship.",
  },
  pewbeam: {
    name: "PewBeam",
    tagline: "AI verse display — no documented public API.",
    icon: Wand2,
    footnote:
      "PewBeam has no documented public API. Connect it through the local connector on the media PC, which drives the display (for example via its NDI output).",
  },
} as const satisfies Record<
  IntegrationApp,
  { name: string; tagline: string; icon: React.ComponentType<{ className?: string }>; footnote: string }
>;

export function IntegrationsPanel({ compact = false }: { compact?: boolean }) {
  const connections = useQuery(api.connections.list);
  const getSecrets = useAction(api.connections.secrets);
  const upsert = useMutation(api.connections.upsert);
  const toggleConn = useMutation(api.connections.toggle);
  const touchConn = useMutation(api.connections.touch);
  const obs = useObs();

  // ---- Form state ----------------------------------------------------------
  const [obsHost, setObsHost] = useState("");
  const [obsPort, setObsPort] = useState("4455");
  const [obsPassword, setObsPassword] = useState("");
  const [obsBusy, setObsBusy] = useState<"connect" | "test" | null>(null);
  const [obsNote, setObsNote] = useState<Note | null>(null);

  const [ewUrl, setEwUrl] = useState("");
  const [ewToken, setEwToken] = useState("");
  const [ewBusy, setEwBusy] = useState(false);
  const [ewConnected, setEwConnected] = useState(false);
  const [ewNote, setEwNote] = useState<Note | null>(null);

  const [pbUrl, setPbUrl] = useState("");
  const [pbToken, setPbToken] = useState("");
  const [pbBusy, setPbBusy] = useState(false);
  const [pbConnected, setPbConnected] = useState(false);
  const [pbNote, setPbNote] = useState<Note | null>(null);

  const ewProbed = useRef(false);
  const pbProbed = useRef(false);

  const connByApp = new Map<IntegrationApp, SafeConnection | undefined>(
    (connections ?? []).map((c) => [c.app as IntegrationApp, c]),
  );
  const obsConn = connByApp.get("obs");
  const ewConn = connByApp.get("easyworship");
  const pbConn = connByApp.get("pewbeam");

  // Prefill config (never secrets) when the stored config arrives.
  useEffect(() => {
    if (obsConn) {
      if (obsConn.host) setObsHost(obsConn.host);
      if (obsConn.port) setObsPort(String(obsConn.port));
    }
  }, [obsConn]);
  useEffect(() => {
    if (ewConn?.url) setEwUrl(ewConn.url);
  }, [ewConn]);
  useEffect(() => {
    if (pbConn?.url) setPbUrl(pbConn.url);
  }, [pbConn]);

  // Auto-probe configured connectors once so statuses are honest on load.
  useEffect(() => {
    if (!ewConn?.url || ewProbed.current) return;
    ewProbed.current = true;
    void (async () => {
      setEwBusy(true);
      const sec = await getSecrets({ app: "easyworship" }).catch(() => ({ password: null, token: null }));
      const res = await connectorClient.ping(ewConn.url!, sec.token);
      setEwConnected(res.ok);
      setEwNote(res);
      setEwBusy(false);
    })();
  }, [ewConn?.url, getSecrets]);

  useEffect(() => {
    if (!pbConn?.url || pbProbed.current) return;
    pbProbed.current = true;
    void (async () => {
      setPbBusy(true);
      const sec = await getSecrets({ app: "pewbeam" }).catch(() => ({ password: null, token: null }));
      const res = await connectorClient.ping(pbConn.url!, sec.token);
      setPbConnected(res.ok);
      setPbNote(res);
      setPbBusy(false);
    })();
  }, [pbConn?.url, getSecrets]);

  // ---- OBS handlers --------------------------------------------------------

  const handleObsConnect = async () => {
    if (!obsHost.trim()) {
      setObsNote({ ok: false, message: "Enter the OBS host (localhost or a LAN address)." });
      return;
    }
    const port = parseInt(obsPort, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      setObsNote({ ok: false, message: "Port must be an integer between 1 and 65535." });
      return;
    }
    setObsBusy("connect");
    try {
      const sec = await getSecrets({ app: "obs" });
      const password = obsPassword || sec.password || "";
      const saved = await upsert({
        app: "obs",
        host: obsHost.trim(),
        port,
        password: obsPassword,
        enabled: true,
      });
      if (!saved.secretsStored && obsPassword) {
        setObsNote({
          ok: false,
          message:
            "OBS password was not saved — set INTEGRATION_CRYPT_KEY in project keys to store it securely (it will still be used for this session).",
        });
      } else {
        setObsNote(null);
      }
      await obs.connect(`ws://${obsHost.trim()}:${port}`, password);
      touchConn({ app: "obs" }).catch(() => undefined);
      setObsNote({ ok: true, message: "Connected to OBS Studio." });
    } catch (e) {
      setObsNote({ ok: false, message: (e as Error).message });
    } finally {
      setObsBusy(null);
    }
  };

  const handleObsTest = async () => {
    setObsBusy("test");
    try {
      const sec = await getSecrets({ app: "obs" });
      const port = parseInt(obsPort, 10);
      const res = await obsAdapter.testConnection(
        obsHost.trim() || "localhost",
        Number.isNaN(port) ? 4455 : port,
        obsPassword || sec.password || "",
      );
      setObsNote(res);
    } finally {
      setObsBusy(null);
    }
  };

  const handleObsDisconnect = () => {
    obs.disconnect();
    setObsNote({ ok: true, message: "Disconnected from OBS Studio." });
  };

  // ---- Connector (EasyWorship / PewBeam) handlers -------------------------

  const connectorConnect = async (app: "easyworship" | "pewbeam") => {
    const url = app === "easyworship" ? ewUrl : pbUrl;
    const token = app === "easyworship" ? ewToken : pbToken;
    const setBusy = app === "easyworship" ? setEwBusy : setPbBusy;
    const setConnected = app === "easyworship" ? setEwConnected : setPbConnected;
    const setNote = app === "easyworship" ? setEwNote : setPbNote;

    if (!url.trim()) {
      setNote({ ok: false, message: "Enter the local connector URL (e.g. http://192.168.1.20:8810)." });
      return;
    }
    setBusy(true);
    try {
      const saved = await upsert({ app, url: url.trim(), token: token || undefined, enabled: true });
      if (!saved.secretsStored && token) {
        setNote({
          ok: false,
          message:
            "Connector token was not saved — set INTEGRATION_CRYPT_KEY in project keys to persist it (it still works for this session).",
        });
      }
      const sec = await getSecrets({ app });
      const res = await connectorClient.ping(url.trim(), token || sec.token);
      setConnected(res.ok);
      setNote(res);
      if (res.ok) touchConn({ app }).catch(() => undefined);
    } catch (e) {
      setConnected(false);
      setNote({ ok: false, message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const connectorTest = async (app: "easyworship" | "pewbeam") => {
    const url = app === "easyworship" ? ewUrl : pbUrl;
    const token = app === "easyworship" ? ewToken : pbToken;
    const setBusy = app === "easyworship" ? setEwBusy : setPbBusy;
    const setConnected = app === "easyworship" ? setEwConnected : setPbConnected;
    const setNote = app === "easyworship" ? setEwNote : setPbNote;
    if (!url.trim()) {
      setNote({ ok: false, message: "Enter the local connector URL first." });
      return;
    }
    setBusy(true);
    try {
      const sec = await getSecrets({ app });
      const res = await connectorClient.ping(url.trim(), token || sec.token);
      setConnected(res.ok);
      setNote(res);
    } finally {
      setBusy(false);
    }
  };

  const connectorDisconnect = (app: "easyworship" | "pewbeam") => {
    if (app === "easyworship") {
      setEwConnected(false);
      setEwNote({ ok: true, message: "Disconnected from the local connector." });
    } else {
      setPbConnected(false);
      setPbNote({ ok: true, message: "Disconnected from the local connector." });
    }
  };

  const toggleApp = async (app: IntegrationApp) => {
    try {
      await toggleConn({ app });
    } catch (e) {
      // Surface via the matching card's note.
      const msg = (e as Error).message;
      if (app === "obs") setObsNote({ ok: false, message: msg });
      else if (app === "easyworship") setEwNote({ ok: false, message: msg });
      else setPbNote({ ok: false, message: msg });
    }
  };

  // ---- Derived integration states ------------------------------------------

  const obsState: IntegrationState = deriveStatus({
    app: "obs",
    configured: Boolean(obsConn && (obsConn.host || obsConn.url)),
    enabled: obsConn?.enabled ?? true,
    live: obs.status === "connected",
    busy: obsBusy !== null,
    error: obsNote && !obsNote.ok ? obsNote.message : null,
    success: obsNote && obsNote.ok ? obsNote.message : null,
    lastConnectedAt: obsConn?.lastConnectedAt,
  });

  const ewState: IntegrationState = deriveStatus({
    app: "easyworship",
    configured: Boolean(ewConn?.url),
    enabled: ewConn?.enabled ?? true,
    live: ewConnected,
    busy: ewBusy,
    error: ewNote && !ewNote.ok ? ewNote.message : null,
    success: ewNote && ewNote.ok ? ewNote.message : null,
    lastConnectedAt: ewConn?.lastConnectedAt,
  });

  const pbState: IntegrationState = deriveStatus({
    app: "pewbeam",
    configured: Boolean(pbConn?.url),
    enabled: pbConn?.enabled ?? true,
    live: pbConnected,
    busy: pbBusy,
    error: pbNote && !pbNote.ok ? pbNote.message : null,
    success: pbNote && pbNote.ok ? pbNote.message : null,
    lastConnectedAt: pbConn?.lastConnectedAt,
  });

  return (
    <div
      className={compact ? "grid gap-3 md:grid-cols-3" : "grid gap-3 lg:grid-cols-3"}
      data-testid="integrations-panel"
    >
      <IntegrationCard
        app="obs"
        name={INTEGRATION_META.obs.name}
        tagline={INTEGRATION_META.obs.tagline}
        icon={INTEGRATION_META.obs.icon}
        state={obsState}
        busy={obsBusy !== null}
        busyLabel={obsBusy === "test" ? "Testing…" : "Connecting…"}
        showTest
        footnote={INTEGRATION_META.obs.footnote}
        onConnect={handleObsConnect}
        onDisconnect={handleObsDisconnect}
        onTest={handleObsTest}
        onToggleEnabled={() => toggleApp("obs")}
        config={
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={obsHost}
                onChange={(e) => setObsHost(e.target.value)}
                placeholder="Host (localhost)"
                className="font-mono text-xs"
              />
              <Input
                value={obsPort}
                onChange={(e) => setObsPort(e.target.value)}
                placeholder="4455"
                className="font-mono text-xs"
              />
            </div>
            <Input
              value={obsPassword}
              onChange={(e) => setObsPassword(e.target.value)}
              placeholder={
                obsConn?.secretsStored
                  ? "WebSocket password (••• stored)"
                  : "WebSocket password (optional)"
              }
              type="password"
              className="font-mono text-xs"
            />
          </>
        }
      />

      <IntegrationCard
        app="easyworship"
        name={INTEGRATION_META.easyworship.name}
        tagline={INTEGRATION_META.easyworship.tagline}
        icon={INTEGRATION_META.easyworship.icon}
        state={ewState}
        busy={ewBusy}
        busyLabel="Connecting…"
        showTest
        footnote={INTEGRATION_META.easyworship.footnote}
        onConnect={() => connectorConnect("easyworship")}
        onDisconnect={() => connectorDisconnect("easyworship")}
        onTest={() => connectorTest("easyworship")}
        onToggleEnabled={() => toggleApp("easyworship")}
        config={
          <>
            <Input
              value={ewUrl}
              onChange={(e) => setEwUrl(e.target.value)}
              placeholder="Local connector URL (e.g. http://192.168.1.20:8810)"
              className="font-mono text-xs"
            />
            <Input
              value={ewToken}
              onChange={(e) => setEwToken(e.target.value)}
              placeholder={
                ewConn?.secretsStored
                  ? "Connector token (••• stored)"
                  : "Connector token (optional)"
              }
              type="password"
              className="font-mono text-xs"
            />
          </>
        }
      />

      <IntegrationCard
        app="pewbeam"
        name={INTEGRATION_META.pewbeam.name}
        tagline={INTEGRATION_META.pewbeam.tagline}
        icon={INTEGRATION_META.pewbeam.icon}
        state={pbState}
        busy={pbBusy}
        busyLabel="Connecting…"
        showTest
        footnote={INTEGRATION_META.pewbeam.footnote}
        onConnect={() => connectorConnect("pewbeam")}
        onDisconnect={() => connectorDisconnect("pewbeam")}
        onTest={() => connectorTest("pewbeam")}
        onToggleEnabled={() => toggleApp("pewbeam")}
        config={
          <>
            <Input
              value={pbUrl}
              onChange={(e) => setPbUrl(e.target.value)}
              placeholder="Local connector URL (e.g. http://192.168.1.20:8810)"
              className="font-mono text-xs"
            />
            <Input
              value={pbToken}
              onChange={(e) => setPbToken(e.target.value)}
              placeholder={
                pbConn?.secretsStored
                  ? "Connector token (••• stored)"
                  : "Connector token (optional)"
              }
              type="password"
              className="font-mono text-xs"
            />
          </>
        }
      />
    </div>
  );
}
