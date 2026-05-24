// Browser-side Supabase client
// Use this in Client Components (files with "use client" at the top)
import { createBrowserClient } from "@supabase/ssr";

// Strip any accidentally-appended REST path from the URL
// (e.g. Vercel env var set to https://xxx.supabase.co/rest/v1/ by mistake)
function cleanUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const { protocol, host } = new URL(raw);
    return `${protocol}//${host}`;
  } catch {
    return raw;
  }
}

export function createClient() {
  return createBrowserClient(
    cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
