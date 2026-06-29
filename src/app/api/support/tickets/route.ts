import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const portal = searchParams.get('portal'); // optional filter

  let query = supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (portal) query = query.eq('portal', portal);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { portal, restaurant_id, claim_id, category, subject, description, contact_email, priority } = body;

  if (!portal || !category || !subject || !description || !contact_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: user.id,
      portal,
      restaurant_id: restaurant_id ?? null,
      claim_id: claim_id ?? null,
      category,
      subject,
      description,
      contact_email,
      priority: priority ?? 'normal',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Confirmation email is sent server-side by the support_ticket_created_email
  // DB trigger (→ send-support-email edge fn), so we don't send it here (avoids
  // duplicates). Same trigger fires for tickets created on web or mobile.

  return NextResponse.json({ ticket: data }, { status: 201 });
}
