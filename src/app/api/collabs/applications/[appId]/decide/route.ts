// POST /api/collabs/applications/[appId]/decide — restaurant owner acts on an
// application. Body: { action: 'accept' | 'decline' | 'shortlist' }.
//
// accept → the posting becomes the contract: set collabs.influencer_id +
// agreed_amount + status='accepted', mark this application 'accepted', decline
// the other pending applicants, and notify the hired creator. The existing
// escrow flow (fund → approve → release) then takes over.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getServiceClient } from '@/lib/stripeAuth';
import { sendEmail, emailLayout } from '@/lib/zeptoMail';

type RouteParams = { params: { appId: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await request.json().catch(() => ({})) as { action?: string };
  if (!['accept', 'decline', 'shortlist'].includes(action ?? '')) {
    return NextResponse.json({ error: 'action must be accept | decline | shortlist' }, { status: 400 });
  }

  const db = getServiceClient();

  // Load application + its posting; verify the caller owns the posting's restaurant.
  const { data: app } = await db
    .from('collab_applications')
    .select('id, posting_id, influencer_id, proposed_amount, status')
    .eq('id', params.appId)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const { data: posting } = await db
    .from('collabs')
    .select('id, restaurant_id, title, status, influencer_id')
    .eq('id', app.posting_id)
    .maybeSingle();
  if (!posting) return NextResponse.json({ error: 'Posting not found' }, { status: 404 });

  const { data: restaurant } = await db
    .from('restaurants')
    .select('owner_id, name')
    .eq('id', posting.restaurant_id)
    .maybeSingle();
  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your collab' }, { status: 403 });
  }

  // Creator's user id + email (for notifications).
  const { data: inf } = await db
    .from('influencers')
    .select('user_id, display_name, instagram_handle')
    .eq('id', app.influencer_id)
    .maybeSingle();
  let creatorEmail: string | null = null;
  if (inf?.user_id) {
    const { data: u } = await db.from('users').select('email').eq('id', inf.user_id).maybeSingle();
    creatorEmail = (u as { email: string | null } | null)?.email ?? null;
  }
  const notifyCreator = async (title: string, body: string) => {
    if (inf?.user_id) await db.from('notifications').insert({ user_id: inf.user_id, type: 'collab_decision', title, body, read: false });
    if (creatorEmail) void sendEmail({ to: creatorEmail, subject: title, html: emailLayout(title, `<p>${body}</p>`), replyTo: 'contact@contact.repeateats.ca' }).catch(() => {});
  };
  const postingTitle = posting.title ?? 'the collab';

  if (action === 'shortlist') {
    await db.from('collab_applications').update({ status: 'shortlisted', updated_at: new Date().toISOString() }).eq('id', app.id);
    await notifyCreator('You were shortlisted', `You're shortlisted for "${postingTitle}".`);
    return NextResponse.json({ ok: true, status: 'shortlisted' });
  }

  if (action === 'decline') {
    await db.from('collab_applications').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', app.id);
    await notifyCreator('Application update', `Your application for "${postingTitle}" wasn't selected this time.`);
    return NextResponse.json({ ok: true, status: 'declined' });
  }

  // action === 'accept'
  if (posting.influencer_id) {
    return NextResponse.json({ error: 'This collab already has a hired creator', code: 'already_filled' }, { status: 409 });
  }

  // Promote the posting to a contract.
  await db.from('collabs').update({
    influencer_id: app.influencer_id,
    agreed_amount: app.proposed_amount ?? null,
    status:        'accepted',
    updated_at:    new Date().toISOString(),
  }).eq('id', posting.id);

  await db.from('collab_applications').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', app.id);

  // Decline the other still-pending / shortlisted applicants for this posting.
  await db.from('collab_applications')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('posting_id', posting.id)
    .neq('id', app.id)
    .in('status', ['pending', 'shortlisted']);

  await notifyCreator('You got the collab! 🎉', `${restaurant.name ?? 'The restaurant'} accepted you for "${postingTitle}". Next: they fund escrow, then you create the content.`);

  return NextResponse.json({ ok: true, status: 'accepted' });
}
