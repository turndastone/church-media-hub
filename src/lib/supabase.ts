// Optional Supabase integration for cloud media storage.
// Activated by VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in the project keys,
// or by saving the same keys on the in-app API Keys page (stored encrypted).
// Until either is set, the app gracefully falls back to Convex storage.

import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Reactive Supabase env: in-app stored keys first, then VITE_* env vars.
 * Returns null while loading or when neither source is configured.
 */
export function useSupabaseEnv(): SupabaseEnv | null {
  const getClientKeys = useAction(api.apiKeys.getClientKeys);
  const [stored, setStored] = useState<SupabaseEnv | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let active = true;
    getClientKeys()
      .then((k) => {
        if (active) setStored(k ? { url: k.url, anonKey: k.anonKey } : null);
      })
      .catch(() => {
        if (active) setStored(null);
      });
    return () => {
      active = false;
    };
  }, [getClientKeys]);

  const env = getSupabaseEnv();
  if (env) return env;
  if (stored === undefined) return null;
  return stored;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

/**
 * Upload a file to a public Supabase Storage bucket.
 * Returns the public URL of the object, or an error.
 */
export async function uploadToSupabase(
  file: File,
  bucket = "media",
  envOverride?: SupabaseEnv | null,
): Promise<{ url: string } | { error: string }> {
  const env = envOverride ?? getSupabaseEnv();
  if (!env) {
    return { error: "Supabase keys are not configured." };
  }
  const path = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    const res = await fetch(
      `${env.url}/storage/v1/object/${bucket}/${path}`,
      {
        method: "PUT",
        headers: {
          apikey: env.anonKey,
          Authorization: `Bearer ${env.anonKey}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        error: `Supabase upload failed (${res.status}). Create a public bucket named "${bucket}" in Storage. ${text}`,
      };
    }
    return { url: `${env.url}/storage/v1/object/public/${bucket}/${path}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function testSupabaseConnection(
  envOverride?: SupabaseEnv | null,
): Promise<{
  ok: boolean;
  message: string;
}> {
  const env = envOverride ?? getSupabaseEnv();
  if (!env) return { ok: false, message: "Keys not configured" };
  try {
    const res = await fetch(`${env.url}/storage/v1/bucket`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
    });
    if (res.ok) return { ok: true, message: "Connected — storage reachable" };
    return { ok: false, message: `Storage responded ${res.status}` };
  } catch {
    return { ok: false, message: "Network error" };
  }
}
