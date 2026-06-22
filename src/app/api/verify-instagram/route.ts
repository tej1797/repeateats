// GET /api/verify-instagram?handle=xxx
// Validates the handle format and, when Meta credentials are configured, looks up
// the public follower count + name via the Instagram Graph API "Business
// Discovery" endpoint. Without credentials it returns format-only (no fake data).
//
// To enable real follower auto-fill, set in env:
//   META_IG_TOKEN     — a long-lived Instagram Graph API access token
//   META_IG_USER_ID   — the IG business/creator user id the token belongs to
// (Business Discovery only resolves public business/creator accounts.)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle')?.replace('@', '').trim();

  if (!handle || handle.length < 2) {
    return NextResponse.json({ valid: false });
  }

  const validFormat = /^[a-zA-Z0-9._]{1,30}$/.test(handle);
  if (!validFormat) {
    return NextResponse.json({ valid: false, handle, note: 'Invalid Instagram handle format' });
  }

  const token  = process.env.META_IG_TOKEN;
  const igUser = process.env.META_IG_USER_ID;

  // No Meta credentials → format-only (followers must be entered manually).
  if (!token || !igUser) {
    return NextResponse.json({
      valid: true, handle, url: `https://instagram.com/${handle}`,
      source: 'format', note: 'Format valid — connect Meta API for live follower lookup',
    });
  }

  // Meta Business Discovery lookup.
  try {
    const fields = `business_discovery.username(${handle}){followers_count,name,profile_picture_url}`;
    const url = `https://graph.facebook.com/v21.0/${igUser}?fields=${encodeURIComponent(fields)}&access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json() as {
      business_discovery?: { followers_count?: number; name?: string; profile_picture_url?: string };
      error?: { message?: string };
    };
    if (json.error || !json.business_discovery) {
      // Account not discoverable (private/personal) — still a valid handle.
      return NextResponse.json({
        valid: true, handle, url: `https://instagram.com/${handle}`,
        source: 'format', note: json.error?.message ?? 'Account not publicly discoverable',
      });
    }
    const bd = json.business_discovery;
    return NextResponse.json({
      valid: true, verified: true, handle,
      url: `https://instagram.com/${handle}`,
      followers: bd.followers_count ?? null,
      full_name: bd.name ?? null,
      avatar_url: bd.profile_picture_url ?? null,
      source: 'meta',
    });
  } catch (err) {
    return NextResponse.json({
      valid: true, handle, url: `https://instagram.com/${handle}`,
      source: 'format', note: err instanceof Error ? err.message : 'Lookup failed',
    });
  }
}
