import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Church as ChurchIcon,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Save,
  Sunrise,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = "daily" | "weekly" | "monthly" | "provincial";

const CATEGORY_ORDER: Category[] = ["daily", "weekly", "monthly", "provincial"];

const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  daily: { label: "Daily", icon: Sunrise },
  weekly: { label: "Weekly", icon: CalendarDays },
  monthly: { label: "Monthly", icon: Moon },
  provincial: { label: "Provincial", icon: Globe },
};

const SOCIAL_OPTIONS: { value: string; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
];

interface ProgramForm {
  title: string;
  description: string;
  category: Category;
  day: string;
  time: string;
  venue: string;
  order: number;
  isActive: boolean;
}

const EMPTY_PROGRAM: ProgramForm = {
  title: "",
  description: "",
  category: "weekly",
  day: "",
  time: "",
  venue: "",
  order: 1,
  isActive: true,
};

interface SocialRow {
  platform: string;
  url: string;
}

const lineListToArray = (value: string) =>
  value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export default function Church() {
  const info = useQuery(api.church.getInfo);
  const allPrograms = useQuery(api.church.listAllPrograms);
  const saveInfo = useMutation(api.church.saveInfo);
  const createProgram = useMutation(api.church.createProgram);
  const updateProgram = useMutation(api.church.updateProgram);
  const deleteProgram = useMutation(api.church.deleteProgram);

  // ── Profile form state ────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [verse, setVerse] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [phones, setPhones] = useState("");
  const [emails, setEmails] = useState("");
  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (!info) return;
    setName(info.name);
    setTagline(info.tagline);
    setDescription(info.description);
    setWelcomeMessage(info.welcomeMessage);
    setVerse(info.verse);
    setAddress(info.address);
    setWebsite(info.website ?? "");
    setPhones(info.phones.join("\n"));
    setEmails(info.emails.join("\n"));
    setSocials(info.socials.map((s) => ({ platform: s.platform, url: s.url })));
  }, [info]);

  // ── Program editor state ──────────────────────────────────────────────
  const [editing, setEditing] = useState<{ id: Id<"programs"> | null; form: ProgramForm } | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<Id<"programs"> | null>(null);
  const [savingProgram, setSavingProgram] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<Category, typeof allPrograms> = {
      daily: [],
      weekly: [],
      monthly: [],
      provincial: [],
    };
    for (const p of allPrograms ?? []) {
      map[p.category as Category]?.push(p);
    }
    for (const cat of CATEGORY_ORDER) {
      map[cat] = [...(map[cat] ?? [])].sort(
        (a, b) => a.order - b.order || a._creationTime - b._creationTime,
      );
    }
    return map;
  }, [allPrograms]);

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      await saveInfo({
        name: name.trim() || "RCCG Solution Ambassador",
        tagline: tagline.trim() || "A Parish of the Redeemed Christian Church of God",
        description: description.trim(),
        welcomeMessage: welcomeMessage.trim(),
        verse: verse.trim(),
        address: address.trim(),
        website: website.trim() || undefined,
        phones: lineListToArray(phones),
        emails: lineListToArray(emails),
        socials: socials.filter((s) => s.url.trim()),
      });
      toast.success("Church profile saved — the website is updated.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingInfo(false);
    }
  };

  const openNewProgram = (category: Category) => {
    const maxOrder = (grouped[category] ?? []).reduce(
      (max, p) => Math.max(max, p.order),
      0,
    );
    setEditing({
      id: null,
      form: { ...EMPTY_PROGRAM, category, order: maxOrder + 1 },
    });
  };

  const openEditProgram = (p: NonNullable<typeof allPrograms>[number]) => {
    setEditing({
      id: p._id,
      form: {
        title: p.title,
        description: p.description,
        category: p.category as Category,
        day: p.day,
        time: p.time,
        venue: p.venue ?? "",
        order: p.order,
        isActive: p.isActive,
      },
    });
  };

  const handleSaveProgram = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.title.trim() || !f.day.trim() || !f.time.trim()) {
      toast.error("Title, day, and time are required.");
      return;
    }
    setSavingProgram(true);
    try {
      const payload = {
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category,
        day: f.day.trim(),
        time: f.time.trim(),
        venue: f.venue.trim() || undefined,
        order: f.order,
        isActive: f.isActive,
      };
      if (editing.id) {
        await updateProgram({ id: editing.id, ...payload });
        toast.success("Program updated.");
      } else {
        await createProgram(payload);
        toast.success("Program added.");
      }
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingProgram(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProgram({ id: deletingId });
      toast.success("Program removed.");
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const dirty =
    !!info &&
    (info.name !== (name.trim() || "RCCG Solution Ambassador") ||
      info.tagline !== (tagline.trim() || "A Parish of the Redeemed Christian Church of God") ||
      info.description !== description.trim() ||
      info.welcomeMessage !== welcomeMessage.trim() ||
      info.verse !== verse.trim() ||
      info.address !== address.trim() ||
      (info.website ?? "") !== website.trim() ||
      info.phones.join("\n") !== phones ||
      info.emails.join("\n") !== emails ||
      JSON.stringify(info.socials) !==
        JSON.stringify(socials.filter((s) => s.url.trim())));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Parish"
        title="Church website"
        description="Edit the church profile, contact details, social links, and the daily, weekly, monthly, and provincial programs shown on the public website."
        actions={
          <Button
            asChild
            variant="outline"
            className="cursor-pointer gap-1.5"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> View website
            </a>
          </Button>
        }
      />

      {/* ── Church profile ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ChurchIcon className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">Church profile</p>
            <p className="text-[11px] text-muted-foreground">
              Shown in the hero, about, and welcome chat on the homepage.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className="tech-label">Church name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="tech-label">Tagline</span>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className="tech-label">Short description</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className="tech-label">AI welcome message</span>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="Used as the opening message of the AI welcome assistant."
            />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className="tech-label">Scripture verse</span>
            <Input value={verse} onChange={(e) => setVerse(e.target.value)} />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className="tech-label">Address</span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ankwa Dobro, Radiance fuel station, opposite Fet-Power, Nsawam, Ghana"
            />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className="tech-label">Website URL · temporary domain</span>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://rccgsolutionambassadors.my.canva.site/..."
            />
          </label>
          <label className="space-y-1.5">
            <span className="tech-label">Phone numbers · one per line</span>
            <Textarea
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              rows={3}
              placeholder={"+234 801 234 5678\n+234 901 234 5678"}
            />
          </label>
          <label className="space-y-1.5">
            <span className="tech-label">Email addresses · one per line</span>
            <Textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder={"rccgsolutionambassador@gmail.com"}
            />
          </label>
        </div>

        {/* Social links */}
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="tech-label">Social media links</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1"
              onClick={() => setSocials((s) => [...s, { platform: "facebook", url: "" }])}
            >
              <Plus className="h-3 w-3" /> Add link
            </Button>
          </div>
          <div className="space-y-2">
            {socials.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/15 p-4 text-center text-xs text-muted-foreground">
                No social links yet — add Facebook, YouTube, Instagram, and more.
              </p>
            )}
            {socials.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={row.platform}
                  onValueChange={(platform) =>
                    setSocials((s) =>
                      s.map((r, j) => (j === i ? { ...r, platform } : r)),
                    )
                  }
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={row.url}
                  onChange={(e) =>
                    setSocials((s) =>
                      s.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)),
                    )
                  }
                  placeholder="https://facebook.com/rccgsolutionambassador"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                  onClick={() => setSocials((s) => s.filter((_, j) => j !== i))}
                  title="Remove link"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <Button
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={handleSaveInfo}
            disabled={savingInfo || !info}
          >
            {savingInfo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save profile
          </Button>
          {dirty && (
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
              Unsaved changes
            </span>
          )}
          {!info && (
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Loading profile…
            </span>
          )}
        </div>
      </section>

      {/* ── Programs ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="tech-label mb-1">Programs & services</p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              These power the programs section of the website and the AI welcome
              assistant. Daily, weekly, monthly, and provincial gatherings are
              shown in tabs on the homepage.
            </p>
          </div>
          <Button
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => openNewProgram("weekly")}
          >
            <Plus className="h-3.5 w-3.5" /> Add program
          </Button>
        </div>

        {!allPrograms ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-white/10 bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const list = grouped[cat] ?? [];
              return (
                <div
                  key={cat}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <meta.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold tracking-tight">
                          {meta.label}
                        </p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                          {list.length} program{list.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1"
                      onClick={() => openNewProgram(cat)}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="divide-y divide-border">
                    {list.length === 0 && (
                      <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                        No {meta.label.toLowerCase()} programs yet.
                      </p>
                    )}
                    {list.map((p) => (
                      <div
                        key={p._id}
                        className="group flex items-start gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-semibold text-foreground">
                              {p.title}
                            </p>
                            {!p.isActive && (
                              <span className="shrink-0 rounded-full border border-muted-foreground/30 px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 text-primary" />
                              {p.day}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" />
                              {p.time}
                            </span>
                            {p.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-primary" />
                                {p.venue}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => openEditProgram(p)}
                            title="Edit program"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingId(p._id)}
                            title="Delete program"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Program editor dialog ──────────────────────────────────────── */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit program" : "Add program"}</DialogTitle>
            <DialogDescription>
              {editing?.id
                ? "Update the program details shown on the website."
                : "Create a new program for the church website."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <label className="space-y-1.5">
                <span className="tech-label">Title</span>
                <Input
                  value={editing.form.title}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })
                  }
                  placeholder="Sunday Worship Service"
                />
              </label>
              <label className="space-y-1.5">
                <span className="tech-label">Description</span>
                <Textarea
                  value={editing.form.description}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })
                  }
                  rows={3}
                />
              </label>
              <label className="space-y-1.5">
                <span className="tech-label">Category</span>
                <Select
                  value={editing.form.category}
                  onValueChange={(category) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, category: category as Category },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ORDER.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="tech-label">Day / frequency</span>
                  <Input
                    value={editing.form.day}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, day: e.target.value } })
                    }
                    placeholder="Sundays"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="tech-label">Time</span>
                  <Input
                    value={editing.form.time}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, time: e.target.value } })
                    }
                    placeholder="8:30 AM – 12:00 PM"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="tech-label">Venue</span>
                  <Input
                    value={editing.form.venue}
                    onChange={(e) =>
                      setEditing({ ...editing, form: { ...editing.form, venue: e.target.value } })
                    }
                    placeholder="Main Auditorium"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="tech-label">Display order</span>
                  <Input
                    type="number"
                    min={1}
                    value={editing.form.order}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, order: Number(e.target.value) || 1 },
                      })
                    }
                  />
                </label>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3.5 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    Visible on the website
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Hidden programs stay saved but are not shown publicly.
                  </p>
                </div>
                <Switch
                  checked={editing.form.isActive}
                  onCheckedChange={(isActive) =>
                    setEditing({ ...editing, form: { ...editing.form, isActive } })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer gap-1.5"
              onClick={handleSaveProgram}
              disabled={savingProgram}
            >
              {savingProgram ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {editing?.id ? "Save changes" : "Add program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete program?</DialogTitle>
            <DialogDescription>
              This permanently removes the program from the website and the AI
              welcome assistant. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setDeletingId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
