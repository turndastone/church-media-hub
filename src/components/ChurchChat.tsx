import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

interface ChatMsg {
  role: ChatRole;
  content: string;
}

const QUICK_REPLIES = [
  "What are your service times?",
  "Where are you located?",
  "What programs do you have?",
  "How can I contact the church?",
];

export function ChurchChat() {
  const info = useQuery(api.church.getInfo);
  const programs = useQuery(api.church.listPrograms);
  const runChat = useAction(api.assistant.chat);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const welcome =
    info?.welcomeMessage ??
    "Welcome to RCCG Solution Ambassador! Ask me anything about our programs, service times, location, or how to reach us. God bless you!";

  // Seed the conversation with the welcome message on first open.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcome }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply } = await runChat({
        messages: next,
        info: info
          ? {
              name: info.name,
              tagline: info.tagline,
              description: info.description,
              welcomeMessage: info.welcomeMessage,
              verse: info.verse,
              address: info.address,
              phones: info.phones,
              emails: info.emails,
              socials: info.socials,
            }
          : undefined,
        programs: (programs ?? []).map((p) => ({
          title: p.title,
          description: p.description,
          category: p.category,
          day: p.day,
          time: p.time,
          venue: p.venue,
        })),
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — I hit a small snag. Please try again in a moment, or reach the church directly via the contact section below.",
        },
      ]);
      console.error("Church chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <motion.button
        type="button"
        aria-label="Chat with the church welcome assistant"
        onClick={() => setOpen((o) => !o)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0b1f5e] text-white shadow-lg shadow-primary/40 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!open && (
          <span className="absolute right-0 top-0 h-3 w-3 animate-pulse rounded-full border-2 border-background bg-emerald-400" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-24 right-5 z-50 flex h-[540px] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-primary to-[#0b1f5e] px-4 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-tight text-white">
                  {info?.name ?? "RCCG Solution Ambassador"}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  AI Welcome Assistant
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-6",
                    m.role === "user"
                      ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                      : "mr-auto rounded-bl-md border border-border bg-secondary/60 text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-secondary/60 px-4 py-3">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick replies */}
            {messages.length <= 1 && (
              <div className="flex shrink-0 flex-wrap gap-1.5 px-4 pb-2">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={loading}
                    className="cursor-pointer rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              className="flex shrink-0 items-center gap-2 border-t border-border bg-background/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about services, location, programs…"
                className="min-w-0 flex-1 rounded-full border border-input bg-secondary/50 px-3.5 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
