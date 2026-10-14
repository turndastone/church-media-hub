import { LogoMark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";

export type LegalDoc = "terms" | "privacy";

type Section = {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type Doc = {
  eyebrow: string;
  title: string;
  intro: string;
  icon: typeof FileText;
  otherDoc: { label: string; to: string };
  sections: Section[];
};

const CHURCH = "RCCG Solution Ambassadors Dobro";
const EMAIL = "rccgsolutionambassador@gmail.com";
const ADDRESS =
  "Radiance Fuel Station, opposite Fet-Power, Dobro, Nsawam, Ghana";
const UPDATED = "October 14, 2026";

const TERMS: Doc = {
  eyebrow: "Legal",
  title: "Terms of Use",
  intro:
    `These Terms of Use govern your access to and use of the ${CHURCH} website, its member area, and the content published on it. By browsing the site or signing in, you agree to these terms.`,
  icon: Scale,
  otherDoc: { label: "Privacy Policy", to: "/privacy" },
  sections: [
    {
      id: "acceptance",
      heading: "1. Acceptance of these terms",
      paragraphs: [
        `By visiting this website, creating an account, or submitting content to it, you confirm that you have read, understood, and agreed to be bound by these Terms of Use and our Privacy Policy. If you do not agree, please do not use the site.`,
        `This website is operated by ${CHURCH}, a parish of the Redeemed Christian Church of God located in Dobro, Nsawam, Ghana.`,
      ],
    },
    {
      id: "about",
      heading: "2. What this website is for",
      paragraphs: [
        `This website exists to serve our congregation and community. It provides information about our services, programmes, and location, publishes sermons, songs, scripture, and media content, allows members to share testimonies, and gives our media team tools to run live services.`,
        `Nothing on this website constitutes professional advice — including but not limited to legal, medical, financial, or counselling advice. For counsel, please speak with a minister of the parish directly.`,
      ],
    },
    {
      id: "accounts",
      heading: "3. Accounts and sign-in",
      bullets: [
        `Access to member features requires sign-in, which is completed with a one-time code sent to your email address.`,
        `You are responsible for the accuracy of the details you provide and for keeping access to your email account secure.`,
        `You must not share your account, impersonate another person, or use a false identity to access member features.`,
        `We may suspend or remove any account that breaches these terms, misuses the site, or behaves in a way that harms the parish or its members.`,
      ],
    },
    {
      id: "submissions",
      heading: "4. Member submissions (testimonies and media)",
      paragraphs: [
        `When you submit a testimony, comment, photo, or other content, you keep ownership of it. By submitting it you grant ${CHURCH} a non-exclusive, royalty-free licence to store, display, and share that content on this website and on our official social channels for the purpose of ministry and encouragement.`,
        `All testimonies are reviewed by an administrator before they appear publicly. We may edit for length, clarity, or privacy, and we may decline or remove any submission at our discretion.`,
      ],
      bullets: [
        `Submit only content that is truthful and that you have the right to share.`,
        `Do not include another person's private, medical, or financial details without their consent.`,
        `Do not submit anything unlawful, abusive, defamatory, hateful, sexually explicit, or that promotes division.`,
        `Do not upload malicious files or attempt to disrupt the website.`,
      ],
    },
    {
      id: "conduct",
      heading: "5. Acceptable use",
      bullets: [
        `Use the website lawfully and respectfully, in a manner consistent with the Christian values of this parish.`,
        `Do not attempt to gain unauthorised access to any account, network, server, or data connected to this site.`,
        `Do not scrape, copy, or republish our content on a large scale without written permission.`,
        `Do not use the site to advertise, solicit, or distribute unsolicited commercial messages.`,
      ],
    },
    {
      id: "content",
      heading: "6. Our content and intellectual property",
      paragraphs: [
        `The name, logo, written content, sermon notes, and original media of ${CHURCH} belong to the parish and may not be used in a way that suggests endorsement, partnership, or affiliation without our written consent.`,
        `Where third-party material is used (for example scripture quotations, song lyrics, hymn texts, or media provided by our streaming partners), it remains the property of its respective owner and is used for worship and non-commercial ministry purposes. Please contact us if you believe material on this site infringes your rights, and we will review and act promptly.`,
      ],
    },
    {
      id: "streams",
      heading: "7. Live streams and third-party services",
      paragraphs: [
        `Our live services are broadcast through third-party platforms such as YouTube, Facebook, and other streaming providers. Your use of those platforms is governed by their own terms and privacy policies. We are not responsible for the availability, content, or practices of external sites that we link to.`,
      ],
    },
    {
      id: "availability",
      heading: "8. Availability and changes to the site",
      paragraphs: [
        `We aim to keep the website available and accurate, but we provide it "as is" and "as available". Services, programmes, and content may change without notice, and the site may occasionally be unavailable for maintenance, live broadcasts, or reasons beyond our control.`,
      ],
    },
    {
      id: "liability",
      heading: "9. Limitation of liability",
      paragraphs: [
        `To the fullest extent permitted by law, ${CHURCH}, its ministers, volunteers, and media team shall not be liable for any indirect, incidental, or consequential loss arising from your use of this website, from content submitted by members, or from reliance on any information published here.`,
        `Nothing in these terms limits liability that cannot lawfully be limited.`,
      ],
    },
    {
      id: "changes",
      heading: "10. Changes to these terms",
      paragraphs: [
        `We may update these Terms of Use from time to time. The revised version takes effect when it is published on this page, with the date at the top updated accordingly. Continued use of the website after a change means you accept the updated terms.`,
      ],
    },
    {
      id: "law",
      heading: "11. Governing law",
      paragraphs: [
        `These terms are governed by the laws of the Republic of Ghana. Any dispute arising from the use of this website shall be subject to the jurisdiction of the courts of Ghana.`,
      ],
    },
    {
      id: "contact",
      heading: "12. Contact us",
      paragraphs: [
        `Questions about these terms may be sent to ${EMAIL}, or in person at ${ADDRESS}.`,
      ],
    },
  ],
};

const PRIVACY: Doc = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  intro:
    `This Privacy Policy explains what information ${CHURCH} collects, why we collect it, and how we protect it when you use our website, sign in as a member, or share a testimony.`,
  icon: ShieldCheck,
  otherDoc: { label: "Terms of Use", to: "/terms" },
  sections: [
    {
      id: "commitment",
      heading: "1. Our commitment",
      paragraphs: [
        `We are a church, not an advertising business. We collect as little personal information as necessary to run this website and to serve our congregation well. We do not sell your personal data, and we do not share it with third parties for marketing purposes.`,
      ],
    },
    {
      id: "collect",
      heading: "2. Information we collect",
      bullets: [
        `Account details — your email address and a display name, collected when you sign in with a one-time code.`,
        `Content you submit — testimonies, titles, and text you choose to publish through the site.`,
        `Uploaded media — images or files you upload, together with basic file metadata.`,
        `Technical data — limited server and security information needed to authenticate your session and keep the site running reliably, such as session tokens and error logs.`,
        `Contact details you choose to send us — for example a phone number or email address included in a message.`,
      ],
      paragraphs: [
        `We do not knowingly collect sensitive information such as health records or financial account numbers through this website. Please do not submit such information in a testimony or message.`,
      ],
    },
    {
      id: "use",
      heading: "3. How we use your information",
      bullets: [
        `To send your one-time sign-in code and keep you signed in.`,
        `To display your name and testimony on the website once an administrator has approved it.`,
        `To review, moderate, and publish member submissions responsibly.`,
        `To operate church features such as programme listings, media content, and live streaming controls for our media team.`,
        `To diagnose errors and protect the website from abuse.`,
      ],
    },
    {
      id: "storage",
      heading: "4. Where your data is stored",
      paragraphs: [
        `Account data, testimonies, and uploaded files are stored in our hosted backend (Convex) and associated file storage, which are secured with access controls and encrypted in transit. Sign-in is handled through one-time codes, so no password is stored for your account.`,
        `Some tools on this website store configuration locally in your browser — for example, administrator preferences and cached error logs. That information stays on your device and can be cleared from the browser at any time.`,
      ],
    },
    {
      id: "sharing",
      heading: "5. When we share information",
      bullets: [
        `With service providers we rely on to run the site — hosting, database, file storage, email delivery, and video streaming — strictly to provide those services.`,
        `With our own ministry team — administrators can review submissions and manage accounts in order to run the website.`,
        `When required by law — if we are legally obliged to disclose information, or to protect the safety and rights of our members and the public.`,
      ],
      paragraphs: [
        `We never sell, rent, or trade your personal information.`,
      ],
    },
    {
      id: "streams",
      heading: "6. Live streams and embedded content",
      paragraphs: [
        `Our live and recorded services may be hosted on or embedded from third-party platforms such as YouTube, Facebook, or other streaming providers. When you watch those videos, the platform may set its own cookies and collect data under its own privacy policy. We encourage you to review the privacy settings of any platform you use.`,
      ],
    },
    {
      id: "retention",
      heading: "7. How long we keep your data",
      paragraphs: [
        `Account information is kept for as long as you remain a member of the website. Testimonies remain published until you or an administrator removes them. Uploaded media is kept while it is needed for the page or programme it supports. You may ask us to delete your account and associated content at any time, and we will act within a reasonable period unless we are required to keep something by law.`,
      ],
    },
    {
      id: "rights",
      heading: "8. Your choices and rights",
      bullets: [
        `You can view and delete your own testimonies from the member area at any time.`,
        `You can ask to see, correct, or delete the personal information we hold about you.`,
        `You can ask us to stop publishing a testimony, and we will remove it promptly.`,
        `You can sign out at any time from your account menu.`,
      ],
      paragraphs: [
        `To make any of these requests, contact us at ${EMAIL}.`,
      ],
    },
    {
      id: "children",
      heading: "9. Children's privacy",
      paragraphs: [
        `Our website is intended for general audiences. We do not knowingly collect personal information from children under 13 without the involvement of a parent or guardian. If you believe a child has provided us with personal information, please contact us so that we can remove it.`,
      ],
    },
    {
      id: "security",
      heading: "10. Security",
      paragraphs: [
        `We use access controls, encrypted connections, and one-time sign-in codes to protect your information. No system can be guaranteed to be completely secure, so please help us by keeping access to your email account safe and by reporting anything suspicious to our team.`,
      ],
    },
    {
      id: "changes",
      heading: "11. Changes to this policy",
      paragraphs: [
        `If we change how we handle personal information, we will update this page and revise the date shown at the top. Significant changes will also be announced on the website.`,
      ],
    },
    {
      id: "contact",
      heading: "12. Contact us",
      paragraphs: [
        `For any privacy question or request, write to ${EMAIL} or reach the parish at ${ADDRESS}.`,
      ],
    },
  ],
};

const DOCS: Record<LegalDoc, Doc> = { terms: TERMS, privacy: PRIVACY };

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: {
      duration: 0.5,
      delay,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  };
}

export default function Legal({ doc }: { doc: LegalDoc }) {
  const content = DOCS[doc];
  const Icon = content.icon;
  const [active, setActive] = useState(content.sections[0]?.id ?? "");

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [doc]);

  // Highlight the section currently in view for the table of contents.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    content.sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [content]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex cursor-pointer items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <div className="leading-none">
              <p className="text-[15px] font-bold tracking-tight">
                Solution<span className="text-primary"> Ambassadors</span>
              </p>
              <p className="mt-1 hidden font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
                RCCG Parish · Dobro
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="cursor-pointer gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
            </Button>
            <Button asChild className="cursor-pointer gap-1.5">
              <Link to={content.otherDoc.to}>{content.otherDoc.label}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="glow-blue relative overflow-hidden pt-32 pb-14 sm:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[46rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp(0)} className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              <Icon className="h-3.5 w-3.5" /> {content.eyebrow}
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {content.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              {content.intro}
            </p>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Last updated · {UPDATED}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* Table of contents */}
            <motion.aside
              {...fadeUp(0)}
              className="hidden lg:block"
            >
              <div className="sticky top-24">
                <p className="tech-label">On this page</p>
                <nav className="mt-4 space-y-1 border-l border-border pl-4">
                  {content.sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={
                        "block cursor-pointer py-1 text-[12px] leading-5 transition-colors " +
                        (active === s.id
                          ? "font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      {s.heading.replace(/^\d+\.\s*/, "")}
                    </a>
                  ))}
                </nav>
                <div className="mt-8 border-t border-border pt-5">
                  <p className="tech-label">Other document</p>
                  <Link
                    to={content.otherDoc.to}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {content.otherDoc.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </motion.aside>

            {/* Document */}
            <motion.article {...fadeUp(0.05)} className="max-w-3xl">
              <div className="space-y-10">
                {content.sections.map((s) => (
                  <div key={s.id} id={s.id} className="scroll-mt-24">
                    <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                      {s.heading}
                    </h2>
                    {s.paragraphs?.map((p) => (
                      <p
                        key={p}
                        className="mt-3 text-[14px] leading-7 text-muted-foreground"
                      >
                        {p}
                      </p>
                    ))}
                    {s.bullets && (
                      <ul className="mt-4 space-y-2.5">
                        {s.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex gap-3 text-[14px] leading-7 text-muted-foreground"
                          >
                            <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Contact card */}
              <div className="mt-12 rounded-2xl border border-primary/30 bg-card/60 p-6">
                <p className="tech-label">Questions?</p>
                <p className="mt-2 text-sm leading-6 text-foreground/90">
                  Write to{" "}
                  <a
                    href={`mailto:${EMAIL}`}
                    className="cursor-pointer font-semibold text-primary hover:text-primary/80"
                  >
                    {EMAIL}
                  </a>{" "}
                  or visit us at {ADDRESS}.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild size="sm" className="cursor-pointer gap-1.5">
                    <a href={`mailto:${EMAIL}`}>
                      <Mail className="h-3.5 w-3.5" /> Email the parish
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="cursor-pointer gap-1.5"
                  >
                    <Link to={content.otherDoc.to}>
                      {content.otherDoc.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-card/40 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              © {new Date().getFullYear()} {CHURCH}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px]">
            <Link
              to="/terms"
              className={
                "cursor-pointer transition-colors " +
                (doc === "terms"
                  ? "font-semibold text-primary"
                  : "text-muted-foreground hover:text-primary")
              }
            >
              Terms of Use
            </Link>
            <Link
              to="/privacy"
              className={
                "cursor-pointer transition-colors " +
                (doc === "privacy"
                  ? "font-semibold text-primary"
                  : "text-muted-foreground hover:text-primary")
              }
            >
              Privacy Policy
            </Link>
            <Link
              to="/"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
            >
              Back to home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
