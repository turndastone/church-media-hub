// Optional Supabase integration for cloud media storage.
// Activated by VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in the project keys.
// Until those are set, the app gracefully falls back to Convex storage.

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

/**
 * Upload a file to a public Supabase Storage bucket.
 * Returns the public URL of the object, or null on failure.
 */
export async function uploadToSupabase(
  file: File,
  bucket = "media",
): Promise<{ url: string } | { error: string }> {
  const env = getSupabaseEnv();
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

export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const env = getSupabaseEnv();
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
