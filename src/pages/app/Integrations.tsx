import { PageHeader } from "@/components/page-header";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { ShieldCheck } from "lucide-react";

export default function Integrations() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Desktop appliances"
        title="Integrations"
        description="Connect the presentation engine (OBS Studio) and the desktop presentation apps (EasyWorship 7, PewBeam). Only OBS has a public API — the others are bridged through the Alpha Worship Bridge local connector."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> Secrets encrypted at rest
          </span>
        }
      />

      <IntegrationsPanel />

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="tech-label mb-3">How connections work</p>
        <div className="grid gap-4 text-[12px] leading-5 text-muted-foreground sm:grid-cols-3">
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground">
              OBS Studio — direct
            </p>
            <p>
              The browser talks to OBS over the documented obs-websocket v5 API
              (WebSocket, default port 4455). Works when this app is served on
              the same network as OBS. Connection is verified before any scene
              or output control is enabled.
            </p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground">
              EasyWorship 7 — via connector
            </p>
            <p>
              No public API exists, so the app never claims direct control. The
              Alpha Worship Bridge connector runs on the media PC and is the
              supported integration point; this app only talks to the connector.
            </p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground">
              PewBeam — via connector
            </p>
            <p>
              PewBeam has no documented public API either. Same bridge pattern:
              configure the connector, and it drives the display on the church
              network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
