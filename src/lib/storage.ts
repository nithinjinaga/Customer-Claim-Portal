import { createClient } from "@supabase/supabase-js";

export const BUCKET = "complaints";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase storage is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createSignedUploadUrl(path: string) {
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data; // { signedUrl, token, path }
}

export async function getSignedUrl(path: string, expiresInSec = 3600) {
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadFile(path: string) {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error) throw error;
  return data; // Blob
}
