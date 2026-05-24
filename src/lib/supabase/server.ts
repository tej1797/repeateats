// Server-side Supabase client
// Use this in Server Components, Server Actions, and Route Handlers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Strip any accidentally-appended REST path from the URL
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
  const cookieStore = cookies();

  return createServerClient(
    cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw in Server Components — safe to ignore here
          }
        },
      },
    }
  );
}
