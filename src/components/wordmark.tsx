import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="RCCG Solution Ambassadors Dobro"
      className={cn("h-9 w-9 object-contain", className)}
      draggable={false}
    />
  );
}

export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-none">
        <p className="text-[15px] font-bold tracking-tight text-foreground">
          Solution<span className="text-primary"> Ambassador</span>
        </p>
        {!compact && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            RCCG · Parish of the Redeemed Christian Church of God
          </p>
        )}
      </div>
    </div>
  );
}
