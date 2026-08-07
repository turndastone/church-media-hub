import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOOKS,
  CURATED_VERSES,
  chapterCount,
  detectVerses,
  formatReference,
  lookupVerse,
  parseBibleReferences,
} from "@/lib/scripture";
import { cn } from "@/lib/utils";
import { useWorkspace, VERSIONS } from "./context";
import {
  BookOpenText,
  BookUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  Loader2,
  Projector,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";

interface SermonSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  suggestedReferences: string[];
}

interface DetectedVerse {
  reference: string;
  text: string;
}

interface CachedVerse {
  text: string;
  copyright?: string;
  error?: string;
}

export default function ScripturePanel() {
  const { version, setVersion, queueSlide, sendToDisplay } = useWorkspace();
  const connections = useQuery(api.connections.list);
  const createTranscript = useMutation(api.transcripts.create);
  const summarizeSermon = useAction(api.gemini.summarizeSermon);
  const explainVerse = useAction(api.gemini.explainVerse);
  const lookupPassage = useAction(api.bible.lookupPassage);

  // ── Bible reader state ─────────────────────────────────────────────
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState(3);
  const [verse, setVerse] = useState(16);
  const [verseCount, setVerseCount] = useState<number | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [verseCache, setVerseCache] = useState<Record<string, CachedVerse>>({});
  const [verseLoading, setVerseLoading] = useState(false);
  const [jump, setJump] = useState("");
  const [readerExplanation, setReaderExplanation] = useState<{ reference: string; text: string } | null>(null);
  const [readerExplainBusy, setReaderExplainBusy] = useState(false);

  // ── Transcript studio state ────────────────────────────────────────
  const [showTranscript, setShowTranscript] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [detected, setDetected] = useState<DetectedVerse[]>([]);
  const [fetched, setFetched] = useState<Record<string, { text: string; copyright?: string }>>({});
  const [fetching, setFetching] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<SermonSummary | null>(null);
  const [explanation, setExplanation] = useState<{ reference: string; text: string } | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const pewbeamReady = (connections ?? []).some((c) => c.app === "pewbeam" && c.url);
  const totalChapters = chapterCount(book);
  const verseKey = `${version}:${book}:${chapter}:${verse}`;
  const reference = formatReference({ book, chapter, verse });
  const cached = verseCache[verseKey];
  const verseText = cached?.text ?? "";
  const fallbackText = !verseText ? lookupVerse(reference)?.text ?? "" : "";

  // Learn how many verses the chapter has (also warms the version mapping).
  useEffect(() => {
    let cancelled = false;
    setChapterLoading(true);
    setReaderError(null);
    lookupPassage({ book, chapter, version })
      .then((res) => {
        if (!cancelled) setVerseCount(res.verseCount || 0);
      })
      .catch((e) => {
        if (!cancelled) setReaderError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setChapterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, version, lookupPassage]);

  // Fetch the selected verse's text (cached per version:book:chapter:verse).
  useEffect(() => {
    if (verseCache[verseKey]) return;
    let cancelled = false;
    setVerseLoading(true);
    lookupPassage({ book, chapter, verse, version })
      .then((res) => {
        if (cancelled) return;
        setVerseCache((prev) => ({
          ...prev,
          [verseKey]: { text: res.text, copyright: res.copyright },
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        setVerseCache((prev) => ({
          ...prev,
          [verseKey]: { text: "", error: (e as Error).message },
        }));
      })
      .finally(() => {
        if (!cancelled) setVerseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verseKey, book, chapter, verse, version, verseCache, lookupPassage]);

  const changeBook = (next: string) => {
    setBook(next);
    setChapter(1);
    setVerse(1);
  };

  const changeChapter = (next: string) => {
    setChapter(Number(next));
    setVerse(1);
  };

  const stepVerse = (dir: -1 | 1) => {
    setVerse((prev) => {
      const max = verseCount ?? prev;
      return Math.min(max, Math.max(1, prev + dir));
    });
  };

  const handleJump = () => {
    const q = jump.trim();
    if (!q) {
      toast.error("Enter a reference like John 3:16");
      return;
    }
    const parsed = parseBibleReferences(q)[0];
    if (!parsed) {
      toast.error(`Couldn't parse “${q}” as a Bible reference`);
      return;
    }
    setBook(parsed.book);
    setChapter(parsed.chapter);
    setVerse(parsed.verse ?? 1);
    setJump("");
  };

  const queueVerse = () => {
    const body = verseText || fallbackText;
    queueSlide({
      kind: "verse",
      title: reference,
      body: body || "No text available — fetch it from the Bible API first.",
      sub: version,
    });
  };

  const projectVerse = () => {
    const body = verseText || fallbackText;
    queueSlide({
      kind: "verse",
      title: reference,
      body: body || "No text available — fetch it from the Bible API first.",
      sub: version,
    });
    const slide = {
      id: `reader-${Date.now()}`,
      kind: "verse" as const,
      title: reference,
      body: body || "No text available — fetch it from the Bible API first.",
      sub: version,
    };
    sendToDisplay(slide);
  };

  const handleReaderExplain = async () => {
    const body = verseText || fallbackText;
    if (!body) {
      toast.error("Fetch the verse text first, then explain it.");
      return;
    }
    setReaderExplainBusy(true);
    setReaderExplanation(null);
    try {
      const res = await explainVerse({ reference, text: body });
      setReaderExplanation({ reference, text: res.explanation });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReaderExplainBusy(false);
    }
  };

  // ── Transcript studio handlers ─────────────────────────────────────

  const lookupRef = async (q: string) => {
    const parsed = parseBibleReferences(q)[0];
    if (!parsed) throw new Error(`Couldn't parse “${q}” as a Bible reference`);
    return lookupPassage({
      book: parsed.book,
      chapter: parsed.chapter,
      verse: parsed.verse,
      verseEnd: parsed.verseEnd,
      chapterEnd: parsed.chapterEnd,
      version,
    });
  };

  const handleDetect = () => {
    if (!text.trim()) {
      toast.error("Paste a sermon transcript first");
      return;
    }
    const verses = detectVerses(text);
    setDetected(verses);
    if (verses.length === 0) toast("No Bible references detected");
    else toast.success(`Detected ${verses.length} reference${verses.length === 1 ? "" : "s"}`);
  };

  const handleSummarize = async () => {
    if (!text.trim()) {
      toast.error("Paste a sermon transcript first");
      return;
    }
    setAiBusy(true);
    try {
      const result = await summarizeSermon({ transcript: text });
      setAiResult(result);
      if (result.title && !title.trim()) setTitle(result.title);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error("Nothing to save");
      return;
    }
    setBusy(true);
    try {
      await createTranscript({
        title: title || `Sermon · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        sourceText: text,
        verses: detected.length > 0 ? detected : detectVerses(text),
      });
      toast.success("Transcript saved");
      setText("");
      setTitle("");
      setDetected([]);
      setAiResult(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleFetchVerse = async (reference: string) => {
    setFetching(reference);
    try {
      const res = await lookupRef(reference);
      setFetched((prev) => ({ ...prev, [reference]: { text: res.text, copyright: res.copyright } }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFetching(null);
    }
  };

  const handleExplain = async (reference: string, verseText: string) => {
    setExplainBusy(true);
    setExplanation(null);
    try {
      const res = await explainVerse({ reference, text: verseText || undefined });
      setExplanation({ reference, text: res.explanation });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExplainBusy(false);
    }
  };

  const queueReference = (reference: string, verseText: string) => {
    queueSlide({
      kind: "verse",
      title: reference,
      body: verseText || "No text available — fetch it from the Bible API first.",
      sub: version,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Mobile version selector */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border p-2 md:hidden">
        {VERSIONS.map((v) => (
          <button
            key={v.abbr}
            onClick={() => setVersion(v.abbr)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] transition-colors",
              version === v.abbr
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-border text-muted-foreground hover:border-accent/30",
            )}
          >
            {v.abbr}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ── Bible reader ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Bible verse display</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Version · book · chapter · verse
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                {version}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
                  pewbeamReady ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-border text-muted-foreground",
                )}
              >
                {pewbeamReady ? "Display ready" : "PewBeam not set"}
              </span>
            </div>
          </div>

          {/* Book · Chapter · Jump */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={book} onValueChange={changeBook}>
              <SelectTrigger size="sm" className="w-[150px] text-xs">
                <SelectValue placeholder="Book" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {BOOKS.map((b) => (
                  <SelectItem key={b.name} value={b.name} className="text-xs">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(chapter)} onValueChange={changeChapter}>
              <SelectTrigger size="sm" className="w-[110px] text-xs">
                <SelectValue placeholder="Chapter" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {Array.from({ length: totalChapters }, (_, i) => i + 1).map((c) => (
                  <SelectItem key={c} value={String(c)} className="text-xs">
                    Chapter {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 cursor-pointer"
                onClick={() => chapter > 1 && changeChapter(String(chapter - 1))}
                disabled={chapter <= 1}
                title="Previous chapter"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 cursor-pointer"
                onClick={() => chapter < totalChapters && changeChapter(String(chapter + 1))}
                disabled={chapter >= totalChapters}
                title="Next chapter"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Input
                value={jump}
                onChange={(e) => setJump(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJump()}
                placeholder="Jump to John 3:16"
                className="h-8 w-[150px] text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 cursor-pointer text-xs" onClick={handleJump}>
                <BookUp className="h-3.5 w-3.5" /> Go
              </Button>
            </div>
          </div>

          {/* Verse selector strip */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {chapterLoading ? "Loading chapter…" : `${book} ${chapter} · verse ${verse}${verseCount ? ` of ${verseCount}` : ""}`}
              </p>
            </div>
            <div className="flex max-h-[120px] flex-wrap gap-1 overflow-y-auto pr-1">
              {verseCount
                ? Array.from({ length: verseCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setVerse(n)}
                      className={cn(
                        "h-7 min-w-7 cursor-pointer rounded-md border px-1.5 font-mono text-[10px] transition-colors",
                        n === verse
                          ? "border-accent/60 bg-accent/15 text-accent"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-accent/40 hover:text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))
                : chapterLoading && (
                    <p className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching chapter…
                    </p>
                  )}
            </div>
          </div>

          {/* Verse display */}
          <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold tracking-tight text-foreground">
                {reference}
                <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {version}
                </span>
              </p>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {verse} / {verseCount ?? "…"}
              </span>
            </div>

            {verseLoading ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching {version} text…
              </p>
            ) : verseText || fallbackText ? (
              <p className="mt-3 text-sm leading-7 text-foreground/90">{verseText || fallbackText}</p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {cached?.error
                  ? `Couldn't fetch ${version} text (${cached.error}).`
                  : "No text yet — fetch it from the Bible API."}
              </p>
            )}

            {!verseText && fallbackText && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                Offline copy · KJV
              </p>
            )}
            {cached?.copyright && verseText && (
              <p className="mt-2 font-mono text-[9px] text-muted-foreground/70">{cached.copyright}</p>
            )}

            {readerError && !verseText && (
              <p className="mt-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] leading-4 text-amber-300">
                {readerError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" className="cursor-pointer gap-1.5" onClick={projectVerse} disabled={!verseText && !fallbackText}>
                <Projector className="h-3.5 w-3.5" /> Project
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer gap-1.5"
                onClick={queueVerse}
                disabled={!verseText && !fallbackText}
              >
                <Layers className="h-3.5 w-3.5" /> Queue
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer gap-1.5"
                onClick={handleReaderExplain}
                disabled={readerExplainBusy || (!verseText && !fallbackText)}
              >
                {readerExplainBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
                Explain
              </Button>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => stepVerse(-1)}
                  disabled={verse <= 1}
                  title="Previous verse"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 cursor-pointer"
                  onClick={() => stepVerse(1)}
                  disabled={!!verseCount && verse >= verseCount}
                  title="Next verse"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {readerExplanation && !readerExplainBusy && (
              <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                  <Sparkles className="h-3 w-3" /> Intro for {readerExplanation.reference}
                </p>
                <p className="text-xs leading-5 text-foreground/85">{readerExplanation.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Transcript studio (collapsible) ───────────────────────── */}
        <div className="mt-4 rounded-xl border border-border bg-card">
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary">
                <Wand2 className="h-3.5 w-3.5 text-accent" />
              </span>
              <span>
                <p className="text-xs font-semibold tracking-tight text-foreground">Transcript studio</p>
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                  Paste · detect · summarize · save
                </p>
              </span>
            </span>
            {showTranscript ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showTranscript && (
            <div className="border-t border-border p-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder={"Paste the sermon transcript here…\n\n“We read in John 3:16 that God so loved the world…”"}
                className="font-mono text-xs leading-5"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" className="cursor-pointer gap-1.5" onClick={handleDetect}>
                  <Wand2 className="h-3.5 w-3.5" /> Detect verses
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer gap-1.5"
                  onClick={handleSummarize}
                  disabled={aiBusy}
                >
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
                  Summarize with AI
                </Button>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="max-w-[180px] text-xs"
                />
                <Button size="sm" variant="outline" className="ml-auto cursor-pointer gap-1.5" onClick={handleSave} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>

              {detected.length > 0 && (
                <div className="mt-4">
                  <p className="tech-label mb-2">Detected references · {detected.length}</p>
                  <div className="flex flex-col gap-2">
                    {detected.map((v, i) => {
                      const fetchedText = fetched[v.reference]?.text;
                      const displayText = v.text || fetchedText;
                      return (
                        <div key={i} className="rounded-lg border border-accent/25 bg-accent/5 p-3">
                          <div className="flex items-start gap-3">
                            <BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold tracking-tight text-accent">{v.reference}</p>
                              <p className="mt-1 text-xs leading-5 text-foreground/85">
                                {displayText || "No text yet — fetch it from the Bible API."}
                              </p>
                              {fetched[v.reference]?.copyright && (
                                <p className="mt-1 font-mono text-[9px] text-muted-foreground/70">{fetched[v.reference].copyright}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 cursor-pointer gap-1.5 px-2.5"
                                onClick={() => queueReference(v.reference, displayText)}
                              >
                                <Layers className="h-3.5 w-3.5" /> Queue
                              </Button>
                              <div className="flex gap-1.5">
                                {!displayText && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 cursor-pointer gap-1 px-2 text-[10px]"
                                    onClick={() => handleFetchVerse(v.reference)}
                                    disabled={fetching === v.reference}
                                  >
                                    {fetching === v.reference ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookUp className="h-3 w-3" />}
                                    Fetch
                                  </Button>
                                )}
                                {displayText && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 cursor-pointer gap-1 px-2 text-[10px]"
                                    onClick={() => handleExplain(v.reference, displayText)}
                                    disabled={explainBusy}
                                  >
                                    <Sparkles className="h-3 w-3 text-accent" /> Explain
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(aiResult || explainBusy || explanation) && (
                <div className={cn("mt-4 rounded-xl border p-3.5", explanation ? "border-border bg-card" : "border-accent/30 bg-accent/5")}>
                  <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                    <Sparkles className="h-3 w-3" /> AI studio · Gemini
                  </p>
                  {explainBusy ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Explaining the verse…
                    </p>
                  ) : explanation ? (
                    <div>
                      <p className="text-xs font-bold text-foreground">{explanation.reference}</p>
                      <p className="mt-1 text-xs leading-5 text-foreground/85">{explanation.text}</p>
                    </div>
                  ) : (
                    aiResult && (
                      <div className="space-y-2.5">
                        <div>
                          <p className="text-sm font-bold tracking-tight text-foreground">{aiResult.title}</p>
                          <p className="mt-1 text-xs leading-5 text-foreground/85">{aiResult.summary}</p>
                        </div>
                        <ul className="flex flex-col gap-1">
                          {aiResult.keyPoints.map((k, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                              {k}
                            </li>
                          ))}
                        </ul>
                        {aiResult.suggestedReferences.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.suggestedReferences.map((r, i) => (
                              <button
                                key={i}
                                className="cursor-pointer rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20"
                                onClick={() => {
                                  const curated = CURATED_VERSES.find((c) => c.reference === r);
                                  queueReference(r, curated?.text ?? "");
                                }}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
