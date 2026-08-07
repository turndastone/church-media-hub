import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { CURATED_VERSES, detectVerses, parseBibleReferences } from "@/lib/scripture";
import { formatUSD, timeAgo } from "@/lib/format";
import { PRO_PRICE_USD, TRIAL_DAYS } from "@/convex/pricing";
import { cn } from "@/lib/utils";
import {
  BookOpenText,
  BookUp,
  CreditCard,
  Loader2,
  Mic,
  PartyPopper,
  Projector,
  Save,
  ScanSearch,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

interface SermonSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  suggestedReferences: string[];
}

interface FetchedVerse {
  text: string;
  copyright?: string;
}

export default function Scripture() {
  const transcripts = useQuery(api.transcripts.list);
  const connections = useQuery(api.connections.list);
  const createTranscript = useMutation(api.transcripts.create);
  const removeTranscript = useMutation(api.transcripts.remove);
  const summarizeSermon = useAction(api.gemini.summarizeSermon);
  const explainVerse = useAction(api.gemini.explainVerse);
  const lookupPassage = useAction(api.bible.lookupPassage);
  const sub = useQuery(api.subscriptions.mySubscription);
  const ensureTrial = useMutation(api.subscriptions.ensureTrial);
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [detected, setDetected] = useState<{ reference: string; text: string }[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [busy, setBusy] = useState(false);

  // AI (Gemini) + Bible API state
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<SermonSummary | null>(null);
  const [explanation, setExplanation] = useState<{ reference: string; text: string } | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [fetched, setFetched] = useState<Record<string, FetchedVerse>>({});
  const [fetching, setFetching] = useState<string | null>(null);
  const [bibleQuery, setBibleQuery] = useState("");
  const [bibleResult, setBibleResult] = useState<{ reference: string; text: string; copyright?: string } | null>(null);
  const [bibleBusy, setBibleBusy] = useState(false);

  const verseCount = (transcripts ?? []).reduce((s, t) => s + t.verses.length, 0);

  const startTrial = async () => {
    setBillingBusy(true);
    try {
      await ensureTrial();
      toast.success(`Your ${TRIAL_DAYS}-day Pro trial has started`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBillingBusy(false);
    }
  };

  const runDetection = () => {
    if (!text.trim()) {
      toast.error("Paste a sermon transcript first");
      return;
    }
    const verses = detectVerses(text);
    setDetected(verses);
    if (verses.length === 0) {
      toast("No Bible references detected — try pasting more text");
    } else {
      toast.success(`Detected ${verses.length} verse reference${verses.length === 1 ? "" : "s"}`);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error("Nothing to save");
      return;
    }
    setBusy(true);
    try {
      const verses = detected.length > 0 ? detected : detectVerses(text);
      await createTranscript({
        title: title || `Sermon · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        sourceText: text,
        verses,
      });
      toast.success("Transcript saved");
      setText("");
      setTitle("");
      setDetected([]);
      setAiResult(null);
      setExplanation(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const projectVerse = async (reference: string) => {
    const conn = (connections ?? []).find((c) => c.app === "pewbeam");
    if (!conn?.url) {
      toast.error("Configure the Pewbeam hook in the Control Room to project verses.");
      return;
    }
    try {
      await fetch(conn.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(conn.token ? { Authorization: `Bearer ${conn.token}` } : {}),
        },
        body: JSON.stringify({ action: "show", token: conn.token ?? null, payload: { reference } }),
      });
      toast.success(`Projecting ${reference} via Pewbeam`);
    } catch (e) {
      toast.error(`Pewbeam request failed: ${(e as Error).message}`);
    }
  };

  // ---- AI + Bible API helpers --------------------------------------------

  const lookupRef = async (q: string) => {
    const parsed = parseBibleReferences(q)[0];
    if (!parsed) throw new Error(`Couldn't parse “${q}” as a Bible reference`);
    return lookupPassage({
      book: parsed.book,
      chapter: parsed.chapter,
      verse: parsed.verse,
      verseEnd: parsed.verseEnd,
      chapterEnd: parsed.chapterEnd,
    });
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
      toast.success("AI summary ready");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const handleFetchVerse = async (reference: string) => {
    setFetching(reference);
    try {
      const res = await lookupRef(reference);
      setFetched((prev) => ({
        ...prev,
        [reference]: { text: res.text, copyright: res.copyright },
      }));
      toast.success(`Fetched ${res.reference || reference}`);
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

  const handleBibleLookup = async () => {
    const q = bibleQuery.trim();
    if (!q) {
      toast.error("Enter a reference like John 3:16");
      return;
    }
    setBibleBusy(true);
    try {
      const res = await lookupRef(q);
      setBibleResult({ reference: res.reference || q, text: res.text, copyright: res.copyright });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBibleBusy(false);
    }
  };

  const lookupSuggestion = async (reference: string) => {
    setBibleBusy(true);
    try {
      const res = await lookupRef(reference);
      setBibleResult({ reference: res.reference || reference, text: res.text, copyright: res.copyright });
      toast.success(`Fetched ${res.reference || reference}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBibleBusy(false);
    }
  };

  const library = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    return CURATED_VERSES.filter(
      (v) =>
        !q ||
        v.reference.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [libraryQuery]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Verse detection"
        title="Scripture"
        description="Paste a sermon transcript and Alpha Worship One detects every Bible reference — then project the verses live through Pewbeam. Fetch full passage text from the Bible API, or let Gemini summarize and explain."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            <ScanSearch className="h-3 w-3" />
            {verseCount} verses detected
          </span>
        }
      />

      {/* Billing status */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary">
              {sub?.access === "pro" ? (
                <Sparkles className="h-4 w-4 text-primary" />
              ) : (
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {sub?.access === "pro"
                  ? "Pro plan"
                  : sub?.trialActive
                    ? "Pro trial active"
                    : "Free plan"}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {sub?.trialActive
                  ? `${sub.daysLeft} days left in your ${TRIAL_DAYS}-day trial`
                  : sub?.trialExpired
                    ? "Trial ended — upgrade to keep Pro"
                    : sub?.access === "pro"
                      ? "Active subscription"
                      : `Start the ${TRIAL_DAYS}-day Pro trial, then ${formatUSD(PRO_PRICE_USD)}/mo`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(sub?.access === "free" || !sub) && (
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={startTrial}
                disabled={billingBusy}
              >
                {billingBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PartyPopper className="h-3.5 w-3.5" />
                )}
                Start free trial
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => navigate("/dashboard/billing")}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {sub?.access === "pro" ? "Manage billing" : "View plans"}
            </Button>
          </div>
        </div>
        {sub?.trialActive && sub.trialEndsAt && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{
                  width: `${Math.min(100, Math.max(0, ((sub.trialEndsAt - (Date.now() - TRIAL_DAYS * 86400000)) / (TRIAL_DAYS * 86400000)) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Trial ends {new Date(sub.trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Transcriber */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary">
                <Mic className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Sermon transcript
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Paste · detect · project
                </p>
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={"Paste the sermon transcript here…\n\n“We read in John 3:16 that God so loved the world. And as Paul reminds us in Philippians 4:13…”"}
              className="font-mono text-xs leading-5"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="cursor-pointer gap-1.5" onClick={runDetection}>
                <Wand2 className="h-3.5 w-3.5" /> Detect verses
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer gap-1.5"
                onClick={handleSummarize}
                disabled={aiBusy}
              >
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                )}
                Summarize with AI
              </Button>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Transcript title (optional)"
                className="max-w-[220px] text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="ml-auto cursor-pointer gap-1.5"
                onClick={handleSave}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save transcript
              </Button>
            </div>
          </div>

          {/* AI summary */}
          {(aiResult || explainBusy) && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="mb-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3 w-3" /> AI studio · Gemini
              </p>
              {explainBusy ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemini is explaining the verse…
                </div>
              ) : (
                aiResult && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-bold tracking-tight text-foreground">
                        {aiResult.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-foreground/85">
                        {aiResult.summary}
                      </p>
                    </div>
                    {aiResult.keyPoints.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {aiResult.keyPoints.map((k, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            {k}
                          </li>
                        ))}
                      </ul>
                    )}
                    {aiResult.suggestedReferences.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                          Suggested references
                        </span>
                        {aiResult.suggestedReferences.map((r, i) => (
                          <button
                            key={i}
                            className="cursor-pointer rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20"
                            onClick={() => lookupSuggestion(r)}
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

          {/* Explanation */}
          {explanation && !explainBusy && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3 w-3" /> Intro for {explanation.reference}
              </p>
              <p className="text-xs leading-5 text-foreground/85">{explanation.text}</p>
            </div>
          )}

          {detected.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="tech-label mb-3">
                Detected references · {detected.length}
              </p>
              <div className="flex flex-col gap-2">
                {detected.map((v, i) => {
                  const fetchedText = fetched[v.reference]?.text;
                  const displayText = v.text || fetchedText;
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-accent/25 bg-accent/5 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold tracking-tight text-accent">
                            {v.reference}
                          </p>
                          {displayText ? (
                            <p className="mt-1 text-xs leading-5 text-foreground/85">
                              {displayText}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              No text yet — fetch it from the Bible API.
                            </p>
                          )}
                          {fetched[v.reference]?.copyright && (
                            <p className="mt-1 font-mono text-[9px] text-muted-foreground/70">
                              {fetched[v.reference].copyright}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 cursor-pointer gap-1.5 px-2.5"
                            onClick={() => projectVerse(v.reference)}
                          >
                            <Projector className="h-3.5 w-3.5" /> Project
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
                                {fetching === v.reference ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <BookUp className="h-3 w-3" />
                                )}
                                Fetch text
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

          {/* Saved transcripts */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="tech-label mb-3">Saved transcripts</p>
            {!transcripts ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : transcripts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing saved yet. Detect verses, then save the transcript.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {transcripts.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {t.title}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t.verses.length} verses · {timeAgo(t._creationTime)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await removeTranscript({ id: t._id });
                        toast("Transcript deleted");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail: lookup + verse library */}
        <div className="space-y-4 lg:col-span-2">
          {/* Bible API lookup */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              <BookOpenText className="h-3 w-3" /> Reference lookup · Bible API
            </p>
            <div className="flex gap-2">
              <Input
                value={bibleQuery}
                onChange={(e) => setBibleQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBibleLookup()}
                placeholder="John 3:16"
                className="text-xs"
              />
              <Button
                size="sm"
                className="shrink-0 cursor-pointer gap-1.5"
                onClick={handleBibleLookup}
                disabled={bibleBusy}
              >
                {bibleBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookUp className="h-3.5 w-3.5" />
                )}
                Fetch
              </Button>
            </div>
            {bibleResult && (
              <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold tracking-tight text-accent">
                    {bibleResult.reference}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 cursor-pointer gap-1 px-2 text-[10px]"
                    onClick={() => projectVerse(bibleResult.reference)}
                  >
                    <Projector className="h-3 w-3" /> Project
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-foreground/80">
                  {bibleResult.text || "No text returned."}
                </p>
                {bibleResult.copyright && (
                  <p className="mt-1.5 font-mono text-[9px] text-muted-foreground/70">
                    {bibleResult.copyright}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Verse library */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="tech-label mb-3">Verse library · KJV</p>
            <Input
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search by reference or text…"
              className="mb-3 text-xs"
            />
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
              {library.map((v) => (
                <div
                  key={v.reference}
                  className={cn(
                    "rounded-lg border p-3",
                    bibleResult?.reference === v.reference
                      ? "border-accent/40 bg-accent/10"
                      : "border-border bg-secondary/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold tracking-tight text-accent">
                      {v.reference}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 cursor-pointer gap-1 px-2 text-[10px]"
                      onClick={() => projectVerse(v.reference)}
                    >
                      <Projector className="h-3 w-3" /> Project
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-foreground/80">
                    {v.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
