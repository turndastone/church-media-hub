import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-9 w-9", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rccg-bg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d3fae" />
          <stop offset="1" stopColor="#0b1f5e" />
        </linearGradient>
        <linearGradient id="rccg-cross" x1="32" y1="18" x2="32" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7e08b" />
          <stop offset="1" stopColor="#d4a72c" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#rccg-bg)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
      <path
        d="M32 8V12M32 52V56M8 32H12M52 32H56M14.3 14.3L17.1 17.1M46.9 46.9L49.7 49.7M49.7 14.3L46.9 17.1M17.1 46.9L14.3 49.7"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M24 18H40M32 18V46M27 37H37" stroke="url(#rccg-cross)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
