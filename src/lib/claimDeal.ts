// Proxy to Supabase claim-deal edge function (atomic claim + redeem + limits + points).

const CLAIM_DEAL_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/claim-deal`;

export interface ClaimDealClaimBody {
  action:           'claim';
  deal_id:          string;
  timer_starts_at?: string;
  claim_for_date?:  string;
}

export interface ClaimDealRedeemBody {
  action:   'redeem';
  qr_code:  string;
}

type ClaimDealBody = ClaimDealClaimBody | ClaimDealRedeemBody;

export async function invokeClaimDeal(
  accessToken: string,
  body: ClaimDealBody,
): Promise<{ data?: unknown; error?: string; status: number }> {
  const res = await fetch(CLAIM_DEAL_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  let json: Record<string, unknown> = {};
  try {
    json = await res.json() as Record<string, unknown>;
  } catch {
    /* empty */
  }

  const errMsg =
    (json.error as string | undefined) ??
    (json.message as string | undefined) ??
    (!res.ok ? `claim-deal failed (${res.status})` : undefined);

  return { data: json, error: errMsg, status: res.status };
}

/** Extract session access token from Supabase server client. */
export async function getAccessToken(
  supabase: { auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> } },
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
