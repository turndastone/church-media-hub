import { createContext, useContext } from "react";

/** Bible translations offered in the fixed left rail. */
export const VERSIONS = [
  { abbr: "KJV", name: "King James Version" },
  { abbr: "NIV", name: "New International Version" },
  { abbr: "NKJV", name: "New King James Version" },
  { abbr: "ESV", name: "English Standard Version" },
  { abbr: "NLT", name: "New Living Translation" },
  { abbr: "AMP", name: "Amplified Bible" },
  { abbr: "MSG", name: "The Message" },
] as const;

export type TabKey =
  | "scripture"
  | "song"
  | "theme"
  | "presentations"
  | "media";

export type SlideKind =
  | "verse"
  | "song"
  | "theme"
  | "media"
  | "note"
  | "black";

export interface Slide {
  id: string;
  kind: SlideKind;
  title: string;
  body?: string;
  sub?: string;
  mediaUrl?: string;
  accent?: string;
}

export interface WorkspaceState {
  version: string;
  setVersion: (v: string) => void;
  /** Add a slide to the presentation strip and show it in the preview. */
  queueSlide: (s: Omit<Slide, "id">) => void;
  /** Project the current slide to the PewBeam display (if configured). */
  sendToDisplay: (s: Slide) => void;
  /** Base URL of the configured PewBeam local connector, when set. */
  pewbeamUrl: string | null;
}

export const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within the Workspace");
  return ctx;
}
