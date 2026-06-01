'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  IconBrandInstagram, IconBrandTiktok, IconStar, IconCheck,
  IconArrowLeft, IconEdit, IconX, IconLoader2,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreatorProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  niche: string | null;
  follower_range: string | null;
  primary_platform: string | null;
  city: string | null;
  avg_rating: number;
  etransfer_email: string | null;
  paypal_email: string | null;
  preferred_payment: string;
  stats: {
    total_earned: number;
    escrow_balance: number;
    completed_collabs: number;
    active_collabs: number;
    avg_rating: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active_collabs: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collab_history: any[];
  monthly_earnings: { month: string; earned: number }[];
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  open:           { label: 'Open',           color: '#6B7280', bg: '#F9FAFB', step: 0 },
  negotiating:    { label: 'Negotiating',    color: '#D97706', bg: '#FFFBEB', step: 1 },
  accepted:       { label: 'Accepted',       color: '#059669', bg: '#ECFDF5', step: 2 },
  content_review: { label: 'Content review', color: '#2563EB', bg: '#EFF6FF', step: 3 },
  completed:      { label: 'Payment released', color: '#7E22CE', bg: '#F5F3FF', step: 4 },
  cancelled:      { label: 'Cancelled',      color: '#DC2626', bg: '#FEF2F2', step: -1 },
};

const COLLAB_STEPS = ['Agreed', 'Content created', 'Restaurant approved', 'Payment released'];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="flex-1 text-center p-4">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-display text-[26px] font-extrabold text-gray-900">{value}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ─── Collab card ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveCollabCard({ collab }: { collab: any }) {
  const cfg = STATUS_CONFIG[collab.status] ?? STATUS_CONFIG.negotiating;
  const pay = collab.creator_rate ?? collab.offer_amount_max ?? collab.offer_amount_min ?? 0;

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-[15px] text-gray-900">{collab.restaurant?.name ?? 'Restaurant'}</p>
          <p className="text-[12px] text-gray-500">{collab.restaurant?.city} · {collab.deliverables ?? 'Collab'}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-extrabold text-[16px]" style={{ color: '#7E22CE' }}>
            ${pay}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-1">
        {COLLAB_STEPS.map((s, i) => {
          const done = cfg.step > i;
          const active = cfg.step === i + 1;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{
                    background: done || active ? '#7E22CE' : '#E5E7EB',
                    color: done || active ? '#fff' : '#9CA3AF',
                  }}>
                  {done ? <IconCheck size={10} /> : i + 1}
                </div>
                <p className="text-[9px] text-gray-400 text-center mt-0.5 leading-tight">{s}</p>
              </div>
              {i < COLLAB_STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mb-4 transition-all"
                  style={{ background: done ? '#7E22CE' : '#E5E7EB' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Brief preview */}
      {collab.brief && (
        <p className="text-[12px] text-gray-500 line-clamp-2">{collab.brief}</p>
      )}

      {/* Deadline */}
      {collab.deadline && (
        <p className="text-[11px] text-orange-600 font-semibold">
          Deadline: {new Date(collab.deadline).toLocaleDateString('en-CA')}
        </p>
      )}
    </div>
  );
}

// ─── Payment section ──────────────────────────────────────────────────────────
function PaymentSection({
  profile, onSave,
}: {
  profile: CreatorProfile;
  onSave: (patch: Record<string, string>) => Promise<void>;
}) {
  const [etransfer, setEtransfer] = useState(profile.etransfer_email ?? '');
  const [paypal,    setPaypal]    = useState(profile.paypal_email ?? '');
  const [preferred, setPreferred] = useState(profile.preferred_payment ?? 'etransfer');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ etransfer_email: etransfer, paypal_email: paypal, preferred_payment: preferred });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const METHODS = [
    { id: 'etransfer', label: 'E-Transfer (Interac)', emoji: '💸' },
    { id: 'paypal',    label: 'PayPal',              emoji: '🅿️' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-gray-400 leading-relaxed">
        Your payment info is shared with restaurants only after a collab is accepted and content is approved.
      </p>

      {METHODS.map((m) => (
        <div key={m.id} className="rounded-xl border p-4" style={{ borderColor: preferred === m.id ? '#7E22CE' : '#E5E7EB' }}>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setPreferred(m.id)}
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
              style={{ borderColor: preferred === m.id ? '#7E22CE' : '#D1D5DB' }}>
              {preferred === m.id && <div className="w-2 h-2 rounded-full bg-purple-700" />}
            </button>
            <span className="font-semibold text-[14px]">{m.emoji} {m.label}</span>
          </div>
          <input
            value={m.id === 'etransfer' ? etransfer : paypal}
            onChange={(e) => m.id === 'etransfer' ? setEtransfer(e.target.value) : setPaypal(e.target.value)}
            placeholder={m.id === 'etransfer' ? 'your@email.com (for Interac)' : 'your@paypal.com'}
            className="w-full h-10 px-3 rounded-lg text-[14px] outline-none transition-all"
            style={{ border: '1.5px solid #E5E7EB', background: '#F9FAFB' }}
          />
        </div>
      ))}

      <button onClick={handleSave} disabled={saving}
        className="w-full h-11 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-60"
        style={{ background: saved ? '#16a34a' : '#7E22CE' }}>
        {saving
          ? <IconLoader2 size={18} className="mx-auto animate-spin" />
          : saved ? 'Saved!' : 'Save payment details'}
      </button>
    </div>
  );
}

// ─── Checklist section ────────────────────────────────────────────────────────
const CHECKLIST_ITEMS = {
  you: [
    'Instagram handle (verified by RepEAT)',
    'Follower count + engagement rate screenshot',
    '2–3 sample content links (past food posts)',
    'Preferred posting timeline',
    'Content brief agreement (signed in-app)',
    'Draft content for approval BEFORE posting',
    'Final posted content URL',
  ],
  restaurant: [
    'Collab brief (what to show, what to avoid)',
    'Complimentary dining/product for content',
    'Payment amount (held in escrow by RepEAT)',
    'Approval within 48 hrs of content submission',
    'Payment released within 24 hrs of posting',
  ],
  repeateats: [
    'Holds payment in escrow until content approved',
    'Releases payment after post verification',
    'Takes 2% platform fee (from creator payout)',
    'Dispute resolution if issues arise',
  ],
};

function ChecklistSection() {
  return (
    <div className="space-y-6">
      {[
        { title: 'What YOU provide to restaurants', items: CHECKLIST_ITEMS.you },
        { title: 'What restaurants provide to YOU', items: CHECKLIST_ITEMS.restaurant },
        { title: 'RepEAT\'s role', items: CHECKLIST_ITEMS.repeateats },
      ].map((section) => (
        <div key={section.title}>
          <p className="text-[13px] font-bold text-gray-700 mb-2">{section.title}</p>
          <div className="space-y-2">
            {section.items.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <IconCheck size={9} className="text-purple-700" />
                </div>
                <p className="text-[13px] text-gray-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreatorProfilePage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;

  const [profile,  setProfile]  = useState<CreatorProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [editName, setEditName] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [savingName, setSavingName] = useState(false);
  const [activeTab,  setActiveTab]  = useState<'collabs' | 'payment' | 'checklist' | 'history' | 'settings'>('collabs');
  const [available,  setAvailable]  = useState(true);
  const [savingAvail, setSavingAvail] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/influencer'); return; }
      fetch('/api/creator/profile')
        .then((r) => r.json())
        .then(({ data: d }) => {
          setProfile(d);
          setNewName(d?.display_name ?? '');
          setAvailable(d?.available !== false); // default true
        })
        .finally(() => setLoading(false));
    });
  }, [supabase, router]);

  const savePatch = async (patch: Record<string, unknown>) => {
    const res = await fetch('/api/creator/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const { data } = await res.json() as { data: unknown };
    if (data && profile) setProfile({ ...profile, ...(patch as Partial<CreatorProfile>) });
  };

  const handleSaveName = async () => {
    setSavingName(true);
    await savePatch({ display_name: newName });
    setSavingName(false);
    setEditName(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <IconLoader2 size={32} className="animate-spin text-purple-700" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center p-6">
        <div>
          <p className="text-2xl mb-3">📭</p>
          <p className="font-bold text-gray-800 mb-2">No creator profile found</p>
          <p className="text-gray-500 text-sm mb-4">Sign up as a creator to get started.</p>
          <Link href="/influencer/signup" className="text-purple-700 font-semibold hover:underline">
            Create creator profile →
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name ?? profile.email.split('@')[0];
  const initials    = displayName.charAt(0).toUpperCase();
  const niches      = profile.niche?.split(', ').filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/influencer" className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
            <IconArrowLeft size={16} /> Back to feed
          </Link>
          <div className="font-display text-[18px] font-extrabold">
            Rep<span style={{ color: '#E85D04' }}>EAT</span>
            <span className="text-[12px] font-semibold text-gray-400 ml-1.5">Creator</span>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.replace('/influencer'))}
            className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">

        {/* ── Section 1: Creator Header ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-100 flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7E22CE, #A855F7)' }}>
                <span className="text-white font-bold text-[28px]">{initials}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Display name */}
              {editName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="font-bold text-[18px] text-gray-900 border-b-2 outline-none pb-0.5"
                    style={{ borderColor: '#7E22CE' }}
                    autoFocus />
                  <button onClick={handleSaveName} disabled={savingName}
                    className="text-purple-700 hover:text-purple-900 transition-colors">
                    {savingName ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
                  </button>
                  <button onClick={() => setEditName(false)} className="text-gray-400 hover:text-gray-600">
                    <IconX size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-bold text-[18px] text-gray-900 truncate">{displayName}</h1>
                  <button onClick={() => setEditName(true)} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                    <IconEdit size={14} />
                  </button>
                </div>
              )}

              {/* Social handles */}
              <div className="flex items-center gap-3 mb-2">
                {profile.instagram_handle && (
                  <a href={`https://instagram.com/${profile.instagram_handle.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[13px] font-semibold text-pink-600 hover:underline">
                    <IconBrandInstagram size={14} /> {profile.instagram_handle}
                  </a>
                )}
                {profile.tiktok_handle && (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-gray-700">
                    <IconBrandTiktok size={14} /> {profile.tiktok_handle}
                  </span>
                )}
              </div>

              {/* Niche pills */}
              {niches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {niches.map((n) => (
                    <span key={n} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: '#F5F3FF', color: '#7E22CE' }}>{n}</span>
                  ))}
                </div>
              )}

              {/* Follower + rating */}
              <div className="flex items-center gap-3 text-[12px] text-gray-500">
                {profile.follower_range && <span>{profile.follower_range} followers</span>}
                {(profile.stats.avg_rating ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <IconStar size={12} className="text-yellow-500" />
                    {profile.stats.avg_rating.toFixed(1)} from restaurants
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Earnings Dashboard ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-[18px] text-gray-900 mb-4">Your Creator Earnings</h2>

          {/* Stats row */}
          <div className="flex divide-x divide-gray-100 mb-5 rounded-xl overflow-hidden border border-gray-100">
            <StatCard emoji="💰"
              value={`$${profile.stats.total_earned}`}
              label="Total earned" />
            <StatCard emoji="🤝"
              value={String(profile.stats.completed_collabs)}
              label="Collabs done" />
            <StatCard emoji="⭐"
              value={profile.stats.avg_rating > 0 ? profile.stats.avg_rating.toFixed(1) : '—'}
              label="Avg rating" />
          </div>

          {profile.stats.escrow_balance > 0 && (
            <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2"
              style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <span className="text-purple-700 font-bold text-[14px]">
                ${profile.stats.escrow_balance} in escrow
              </span>
              <span className="text-[12px] text-purple-500">
                · {profile.stats.active_collabs} collab{profile.stats.active_collabs !== 1 ? 's' : ''} in progress
              </span>
            </div>
          )}

          {/* Monthly chart */}
          {profile.monthly_earnings.some((m) => m.earned > 0) ? (
            <div>
              <p className="text-[12px] font-semibold text-gray-400 mb-3">Monthly earnings (last 6 months)</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={profile.monthly_earnings} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [`$${Number(v)}`, 'Earned']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="earned" fill="#7E22CE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-6 rounded-xl" style={{ background: '#F9FAFB' }}>
              <p className="text-[13px] text-gray-400">Complete collabs to see your earnings chart</p>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {([
              { id: 'collabs',  label: `Active (${profile.active_collabs.length})` },
              { id: 'payment',  label: 'Payment' },
              { id: 'checklist', label: 'Checklist' },
              { id: 'history',  label: 'History' },
              { id: 'settings', label: 'Settings' },
            ] as const).map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-1 py-3 text-[13px] font-semibold border-b-2 transition-all"
                style={{
                  borderBottomColor: activeTab === t.id ? '#7E22CE' : 'transparent',
                  color: activeTab === t.id ? '#7E22CE' : '#9CA3AF',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Active collabs */}
            {activeTab === 'collabs' && (
              profile.active_collabs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="text-[14px] font-semibold text-gray-700 mb-1">No active collabs</p>
                  <p className="text-[13px] text-gray-400 mb-4">Browse the feed and apply to get started.</p>
                  <Link href="/influencer"
                    className="text-[13px] font-semibold hover:underline" style={{ color: '#7E22CE' }}>
                    Browse collabs →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.active_collabs.map((c) => <ActiveCollabCard key={c.id} collab={c} />)}
                </div>
              )
            )}

            {/* Payment */}
            {activeTab === 'payment' && (
              <PaymentSection profile={profile}
                onSave={async (patch) => { await savePatch(patch); }} />
            )}

            {/* Checklist */}
            {activeTab === 'checklist' && <ChecklistSection />}

            {/* Settings */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[14px] text-gray-900">Available for collabs</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {available ? 'Restaurants can find and contact you' : 'Your profile is hidden from restaurant discovery'}
                      </p>
                    </div>
                    <button
                      disabled={savingAvail}
                      onClick={async () => {
                        setSavingAvail(true);
                        const next = !available;
                        await savePatch({ available: next });
                        setAvailable(next);
                        setSavingAvail(false);
                      }}
                      className="relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60"
                      style={{ background: available ? '#7E22CE' : '#D1D5DB' }}
                    >
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                        style={{ left: available ? 'calc(100% - 22px)' : 2 }} />
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-4 space-y-2 text-[13px] text-gray-400">
                  <p className="font-semibold text-gray-600">About & Support</p>
                  <a href="mailto:support@repeateats.ca" className="block hover:text-[#7E22CE] transition-colors">Contact support</a>
                  <a href="/privacy" className="block hover:text-[#7E22CE] transition-colors">Privacy policy</a>
                  <a href="/terms" className="block hover:text-[#7E22CE] transition-colors">Terms of service</a>
                </div>
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              profile.collab_history.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[14px] font-semibold text-gray-700 mb-1">No completed collabs yet</p>
                  <p className="text-[13px] text-gray-400">Your collab history will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Restaurant', 'Amount', 'Date', 'Status'].map((h) => (
                          <th key={h} className="text-left pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {profile.collab_history.map((c: any) => {
                        const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.completed;
                        const pay = c.creator_rate ?? c.offer_amount_max ?? 0;
                        const date = c.payment_released_at
                          ? new Date(c.payment_released_at).toLocaleDateString('en-CA')
                          : '—';
                        return (
                          <tr key={c.id}>
                            <td className="py-2.5 font-semibold text-gray-800">{c.restaurant?.name ?? '—'}</td>
                            <td className="py-2.5 font-bold text-purple-700">${pay}</td>
                            <td className="py-2.5 text-gray-500">{date}</td>
                            <td className="py-2.5">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
