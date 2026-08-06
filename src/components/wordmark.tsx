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
        <linearGradient id="aw-bg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a2142" />
          <stop offset="1" stopColor="#141120" />
        </linearGradient>
        <linearGradient id="aw-sig" x1="18" y1="50" x2="46" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#aw-bg)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
      <path d="M20 46L32 18L44 46" stroke="url(#aw-sig)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 37H39" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="12" r="3" fill="#fbbf24" />
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
          Alpha Worship
          <span className="text-primary"> One</span>
        </p>
        {!compact && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            Church Media Console
          </p>
        )}
      </div>
    </div>
  );
}
