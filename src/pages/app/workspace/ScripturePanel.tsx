import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CURATED_VERSES,
  detectVerses,
  parseBibleReferences,
} from "@/lib/scripture";
import { cn } from "@/lib/utils";
import { useWorkspace, VERSIONS } from "./context";
import {
  BookOpenText,
  BookUp,
  Layers,
  Loader2,
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

export default function ScripturePanel() {
  const { version, setVersion, queueSlide } = useWorkspace();
  const connections = useQuery(api.connections.list);
  const createTranscript = useMutation(api.transcripts.create);
  const summarizeSermon = useAction(api.gemini.summarizeSermon);
  const explainVerse = useAction(api.gemini.explainVerse);
  const lookupPassage = useAction(api.bible.lookupPassage);

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [detected, setDetected] = useState<DetectedVerse[]>([]);
  const [fetched, setFetched] = useState<Record<string, { text: string; copyright?: string }>>({});
  const [fetching, setFetching] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<SermonSummary | null>(null);
  const [explanation, setExplanation] = useState<{ reference: string; text: string } | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<{ reference: string; text: string; copyright?: string } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const pewbeamReady = (connections ?? []).some((c) => c.app === "pewbeam" && c.url);

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

  const handleLookup = async () => {
    const q = lookup.trim();
    if (!q) {
      toast.error("Enter a reference like John 3:16");
      return;
    }
    setLookupBusy(true);
    try {
      const res = await lookupRef(q);
      setLookupResult({ reference: res.reference || q, text: res.text, copyright: res.copyright });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLookupBusy(false);
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Transcript</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Paste · detect · queue · {version}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
              pewbeamReady ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-border text-muted-foreground",
            )}
          >
            {pewbeamReady ? "Display ready" : "PewBeam not set"}
          </span>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
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

        {/* Detected references */}
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

        {/* AI summary */}
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

        {/* Reference lookup */}
        <div className="mt-4 rounded-xl border border-border bg-card p-3.5">
          <p className="tech-label mb-2">Reference lookup · {version}</p>
          <div className="flex gap-2">
            <Input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="John 3:16"
              className="text-xs"
            />
            <Button size="sm" className="shrink-0 cursor-pointer gap-1.5" onClick={handleLookup} disabled={lookupBusy}>
              {lookupBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookUp className="h-3.5 w-3.5" />}
              Fetch
            </Button>
          </div>
          {lookupResult && (
            <div className="mt-2.5 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-tight text-accent">{lookupResult.reference}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 cursor-pointer gap-1 px-2 text-[10px]"
                  onClick={() => queueReference(lookupResult.reference, lookupResult.text)}
                >
                  <Layers className="h-3 w-3" /> Queue
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-foreground/80">{lookupResult.text || "No text returned."}</p>
              {lookupResult.copyright && (
                <p className="mt-1.5 font-mono text-[9px] text-muted-foreground/70">{lookupResult.copyright}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
