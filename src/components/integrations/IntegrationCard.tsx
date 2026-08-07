import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { IntegrationApp, IntegrationState } from "@/lib/integrations";
import { statusTone } from "@/lib/integrations";
import {
  CircleDashed,
  Loader2,
  Plug,
  Power,
  RotateCw,
  Unplug,
} from "lucide-react";

interface IntegrationCardProps {
  app: IntegrationApp;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  state: IntegrationState;
  busy?: boolean;
  busyLabel?: string;
  showTest?: boolean;
  config?: ReactNode;
  footnote?: ReactNode;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTest?: () => void;
  onToggleEnabled?: (enabled: boolean) => void;
}

const PILL: Record<
  "ok" | "warn" | "err" | "muted",
  string
> = {
  ok: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
  warn: "border-amber-400/40 bg-amber-400/10 text-amber-400",
  err: "border-destructive/50 bg-destructive/10 text-destructive",
  muted: "border-border text-muted-foreground",
};

const STATUS_LABEL: Record<IntegrationState["status"], string> = {
  unavailable: "Not configured",
  requires_connector: "Requires local connector",
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  error: "Error",
};

export function IntegrationCard({
  app,
  name,
  tagline,
  icon: Icon,
  state,
  busy = false,
  busyLabel = "Working…",
  showTest = false,
  config,
  footnote,
  onConnect,
  onDisconnect,
  onTest,
  onToggleEnabled,
}: IntegrationCardProps) {
  const tone = statusTone(state.status);
  const isConnected = state.status === "connected";
  const disabled = Boolean(state.disabled);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 transition-colors",
        disabled ? "border-border opacity-70" : "border-border",
      )}
      data-app={app}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {name}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
                PILL[tone],
              )}
            >
              {disabled ? "Disabled" : STATUS_LABEL[state.status]}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            {tagline}
          </p>
        </div>
        {onToggleEnabled && (
          <Switch
            checked={!disabled}
            onCheckedChange={onToggleEnabled}
            aria-label={`Enable ${name}`}
            className="shrink-0 cursor-pointer"
          />
        )}
      </div>

      {/* Config / explanation */}
      {config && <div className="mt-4 space-y-2.5">{config}</div>}
      {footnote && (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
          {footnote}
        </div>
      )}

      {/* Status message */}
      {state.message && (
        <p
          className={cn(
            "mt-3 flex items-start gap-1.5 text-[11px] leading-4",
            tone === "err"
              ? "text-destructive"
              : tone === "ok"
                ? "text-emerald-400"
                : "text-muted-foreground",
          )}
        >
          <CircleDashed
            className={cn(
              "mt-0.5 h-3 w-3 shrink-0",
              tone === "err" && "text-destructive",
            )}
          />
          {state.message}
        </p>
      )}

      {/* Actions */}
      {(onConnect || onDisconnect || onTest) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {!isConnected && onConnect && (
            <Button
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={onConnect}
              disabled={busy || disabled}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="h-3.5 w-3.5" />
              )}
              {busy ? busyLabel : state.status === "unavailable" || state.status === "requires_connector"
                ? "Configure & connect"
                : "Connect"}
            </Button>
          )}
          {isConnected && onDisconnect && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={onDisconnect}
              disabled={busy || disabled}
            >
              <Unplug className="h-3.5 w-3.5" /> Disconnect
            </Button>
          )}
          {showTest && onTest && (
            <Button
              size="sm"
              variant="ghost"
              className="cursor-pointer gap-1.5"
              onClick={onTest}
              disabled={busy || disabled}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              Test
            </Button>
          )}
          {disabled && (
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              <Power className="h-3 w-3" /> Disabled
            </span>
          )}
        </div>
      )}
    </div>
  );
}
