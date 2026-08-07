import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Slide } from "./context";

interface ProgramPreviewProps {
  slide: Slide | null;
  /** Block-updating caption text (live audio-to-text feed). */
  captionText?: string;
  /** Toggle the caption band on/off. */
  captionsOn?: boolean;
}

/**
 * Split caption text into display blocks (~2 sentences each) so the feed
 * "updates block-by-block" like a real transcription overlay.
 */
function splitCaptionBlocks(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const blocks: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    blocks.push(sentences.slice(i, i + 2).join(" "));
  }
  return blocks;
}

/** Rolling caption window (last 1–2 blocks) driven by a block cursor. */
function useCaptionBlocks(text: string, on: boolean, intervalMs: number) {
  const blocks = useMemo(() => splitCaptionBlocks(text), [text]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!on || blocks.length === 0) return;
    setCursor(0);
    const id = setInterval(() => {
      setCursor((c) => Math.min(c + 1, blocks.length - 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [on, blocks, intervalMs]);

  const history = useMemo(() => {
    if (blocks.length === 0) return [];
    const end = Math.min(cursor + 1, blocks.length);
    return blocks.slice(Math.max(0, end - 2), end);
  }, [blocks, cursor]);

  return history;
}

/**
 * 16:9 program output — the composed frame the operator sends to the
 * projector / broadcast engine:
 *
 *   Layer 1 · Base       — media, theme, song, or program background (1080p safe)
 *   Layer 2 · Verse      — lower-third overlay (semi-transparent black box)
 *   Layer 3 · Captions   — scrolling audio-to-text band pinned to the bottom 10%
 */
export default function ProgramPreview({ slide, captionText = "", captionsOn = false }: ProgramPreviewProps) {
  const captionHistory = useCaptionBlocks(captionText, captionsOn, 2600);
  const isVerse = slide?.kind === "verse";
  const isSong = slide?.kind === "song";
  const isBlack = !slide || slide.kind === "black";

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      {/* ── Layer 1 · Base canvas (1080p safe) ─────────────────────── */}
      <div className="absolute inset-0">
        {isBlack ? (
          <div className="absolute inset-0 bg-black" />
        ) : slide?.kind === "media" && slide.mediaUrl ? (
          <img src={slide.mediaUrl} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : slide?.kind === "theme" ? (
          <div
            className="absolute inset-0"
            style={{
              background: slide.accent
                ? `linear-gradient(135deg, ${slide.accent}, #0a0a0f)`
                : "linear-gradient(135deg, #18181b, #09090b)",
            }}
          />
        ) : (
          /* Program background: deep broadcast-grade gradient */
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 10%, oklch(0.42 0.14 292 / 55%), transparent 60%), linear-gradient(160deg, #141218 0%, #0a0a0f 55%, #060609 100%)",
            }}
          >
            {/* fine grid texture so the canvas reads as a live feed */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                backgroundSize: "48px 27px",
              }}
            />
          </div>
        )}
      </div>

      {/* Safe-area chip */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm">
        <span className={cn("h-1 w-1 rounded-full", captionsOn ? "bg-red-400" : "bg-white/40")} />
        16:9 · 1080p
      </div>

      {/* ── Layer 2 · Song / verse / note content ──────────────────── */}
      {!isBlack && (isSong || (!isVerse && slide?.kind !== "media" && slide?.kind !== "theme")) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-semibold tracking-tight text-white sm:text-2xl">{slide?.title}</p>
          {slide?.sub && (
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">{slide.sub}</p>
          )}
          {slide?.body && (
            <p className="max-w-md text-xs leading-6 text-white/85 sm:text-sm">{slide.body}</p>
          )}
        </div>
      )}

      {/* ── Layer 2 · Verse lower-third overlay ────────────────────── */}
      {isVerse && (
        <div className="absolute inset-x-0 bottom-[13%] z-10 flex justify-center px-[6%]">
          <div className="w-full max-w-[86%] rounded-md bg-black/65 px-4 py-2.5 shadow-lg backdrop-blur-[2px] sm:px-6 sm:py-3">
            <div className="flex items-baseline gap-2.5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-violet-300 sm:text-[10px]">
                {slide?.title}
              </p>
              {slide?.sub && (
                <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/50">{slide.sub}</p>
              )}
            </div>
            {slide?.body && (
              <p className="mt-1 text-xs font-medium leading-5 text-white sm:text-sm sm:leading-6">
                {slide.body}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Layer 3 · Live captions (bottom 10% band) ──────────────── */}
      <AnimatePresence>
        {captionsOn && captionHistory.length > 0 && (
          <motion.div
            key={captionHistory.join("|")}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute inset-x-0 bottom-0 z-10 flex h-[11%] items-center justify-center px-[4%]"
          >
            <div className="flex w-full flex-col items-center gap-1">
              <p className="max-w-[92%] text-center text-[11px] font-medium leading-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-sm">
                {captionHistory[0]}
              </p>
              <AnimatePresence>
                {captionHistory[1] && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-[92%] text-center text-[11px] font-normal leading-4 text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-sm"
                  >
                    {captionHistory[1]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
