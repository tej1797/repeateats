// POST /api/collabs/[id]/apply — a creator applies to an open collab posting.
// Creates a collab_applications row (many creators can apply to one posting) and
// notifies the restaurant owner. Body: { proposed_amount?: number, pitch?: string }
//
// This replaces the old "overwrite the posting's influencer_id" behaviour, which
// could only ever hold one applicant and gave the restaurant nothing to review.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getServiceClient } from '@/lib/stripeAuth';
import { sendEmail, emailLayout } from '@/lib/zeptoMail';

type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { proposed_amount, pitch } = await request.json().catch(() => ({})) as {
    proposed_amount?: number; pitch?: string;
  };

  const db = getServiceClient();

  // Resolve the creator's profile. Do NOT auto-create a blank one — that's the
  // bug that left the restaurant with no name/handle to show.
  const { data: inf } = await db
    .from('influencers')
    .select('id, display_name, instagram_handle')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!inf) {
    return NextResponse.json(
      { error: 'Complete your creator profile before applying.', code: 'no_creator_profile' },
      { status: 400 },
    );
  }

  // The posting must exist and still be open.
  const { data: posting } = await db
    .from('collabs')
    .select('id, restaurant_id, status, influencer_id, title')
    .eq('id', params.id)
    .maybeSingle();
  if (!posting) return NextResponse.json({ error: 'Collab not found' }, { status: 404 });
  if (posting.influencer_id || (posting.status && posting.status !== 'open')) {
    return NextResponse.json({ error: 'This collab is no longer open for applications', code: 'closed' }, { status: 409 });
  }

  // One application per creator per posting (unique constraint backs this up).
  const { data: existing } = await db
    .from('collab_applications')
    .select('id, status')
    .eq('posting_id', posting.id)
    .eq('influencer_id', inf.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'You have already applied to this collab', code: 'already_applied', application: existing }, { status: 409 });
  }

  const { data: application, error } = await db
    .from('collab_applications')
    .insert({
      posting_id:      posting.id,
      influencer_id:   inf.id,
      proposed_amount: proposed_amount ?? null,
      pitch:           pitch?.trim() || null,
      status:          'pending',
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the restaurant owner (in-app + email).
  const { data: restaurant } = await db
    .from('restaurants')
    .select('owner_id, name, owner_email')
    .eq('id', posting.restaurant_id)
    .maybeSingle();
  if (restaurant?.owner_id) {
    const who = inf.display_name || (inf.instagram_handle ? `@${inf.instagram_handle}` : 'A creator');
    const postingTitle = posting.title ?? 'your collab';
    await db.from('notifications').insert({
      user_id: restaurant.owner_id,
      type:    'collab_application',
      title:   'New collab application',
      body:    `${who} applied to "${postingTitle}"${proposed_amount ? ` — proposed $${proposed_amount}` : ''}.`,
      read:    false,
    });
    if (restaurant.owner_email) {
      void sendEmail({
        to: restaurant.owner_email,
        subject: `New collab application: ${postingTitle}`,
        html: emailLayout('New creator application', `
          <p><b>${who}</b> applied to your collab <b>"${postingTitle}"</b>${proposed_amount ? ` and proposed <b>$${proposed_amount}</b>` : ''}.</p>
          ${pitch?.trim() ? `<p style="margin-top:10px;color:#555">"${pitch.trim().replace(/</g, '&lt;')}"</p>` : ''}
          <p style="margin-top:12px">Review and accept them in your RepEAT dashboard → Collabs → Applications.</p>
        `),
        replyTo: 'contact@contact.repeateats.ca',
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, application }, { status: 201 });
}
