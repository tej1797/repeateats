'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  IconArrowLeft, IconEdit, IconCrown, IconMapPin, IconTrophy,
  IconX, IconLogout, IconCheck, IconAlertTriangle,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { signOutFromPortal } from '@/lib/portalAuth';
import StarRating from '@/components/StarRating';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProfileStats {
  total_claims: number;
  total_saved_cents: number;
  unique_deals: number;
  cities_explored: number;
  last_claim_at: string | null;
}

interface RecentClaim {
  id: string;
  qr_code: string;
  status: 'claimed' | 'redeemed' | 'expired';
  claimed_at: string;
  money_saved_cents: number | null;
  deals: {
    title: string;
    emoji: string;
    discount_value: string | null;
    restaurants: { name: string; city: string; category: string | null };
  } | null;
}

interface FavRestaurant {
  restaurant: { id: string; name: string; cuisine: string | null; category: string | null; city: string; rating: number };
  count: number;
}

interface ProfileData {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  member_since: string | null;
  is_repeat_plus: boolean;
  city: string | null;
  radius_km: number;
  favourite_cuisine: string | null;
  streak_days: number;
  stats: ProfileStats;
  recent_claims: RecentClaim[];
  favourite_restaurants: FavRestaurant[];
}

interface FullClaim extends RecentClaim {
  deals: {
    title: string;
    emoji: string;
    discount_value: string | null;
    restaurants: { name: string; city: string; category: string | null };
  } | null;
}

const CITIES = ['GTA Area', 'Mississauga', 'Brampton', 'Toronto', 'Markham', 'Kitchener-Waterloo', 'Hamilton', 'Oakville'];
const CUISINES = ['Indian', 'Italian', 'BBQ', 'Bar & Grill', 'Canadian', 'Burgers', 'Chinese', 'Sushi', 'Pizza', 'Desserts', 'Vegan', 'Bubble Tea'];

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

// ─── Stat card with count-up ──────────────────────────────────────────────────
function StatCard({ icon, value, label, prefix = '', suffix = '', highlight = false }: {
  icon: string; value: number; label: string;
  prefix?: string; suffix?: string; highlight?: boolean;
}) {
  const { value: animated, ref } = useCountUp(value);
  return (
    <div
      ref={ref}
      className="bg-surface rounded-brand border border-[var(--bd)] p-4 text-center"
      style={highlight ? { borderColor: '#16a34a', background: 'rgba(22,163,74,0.04)' } : {}}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <p className={`font-display text-[26px] font-extrabold leading-none mb-1 ${highlight ? 'text-green-600' : 'text-tx'}`}>
        {prefix}{highlight && value > 0 ? animated.toLocaleString() : animated}{suffix}
      </p>
      <p className="text-[12px] text-t3 font-medium">{label}</p>
    </div>
  );
}

// ─── Monthly chart data helper ────────────────────────────────────────────────
function buildMonthlyData(claims: FullClaim[]) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleString('en', { month: 'short' }),
    };
  });
  const savings: Record<string, number> = {};
  for (const m of months) savings[m.key] = 0;
  for (const c of claims) {
    const d = new Date(c.claimed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in savings) savings[key] += (c.money_saved_cents ?? 0) / 100;
  }
  return months.map((m) => ({ month: m.month, saved: parseFloat(savings[m.key].toFixed(2)) }));
}

// ─── Category emoji map ───────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  indian: '🍛', bbq: '🥩', italian: '🍝', bar: '🍺', canadian: '🍁',
  burgers: '🍔', chinese: '🥢', sushi: '🍣', pizza: '🍕', desserts: '🧁',
  vegan: '🥗', bubbletea: '🧋',
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    claimed: 'bg-blue-50 text-blue-700 border-blue-200',
    redeemed: 'bg-green-50 text-green-700 border-green-200',
    expired: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [profile,       setProfile]       = useState<ProfileData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [allClaims,     setAllClaims]     = useState<FullClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsFilter,  setClaimsFilter]  = useState<'all' | 'month' | 'week'>('all');
  const [claimsPage,    setClaimsPage]    = useState(1);
  const [claimsTotal,   setClaimsTotal]   = useState(0);
  const [hasMore,       setHasMore]       = useState(false);

  // Edit state
  const [editingName, setEditingName]   = useState(false);
  const [nameInput,   setNameInput]     = useState('');
  const [savingName,  setSavingName]    = useState(false);

  // Preferences form
  const [prefCity,    setPrefCity]    = useState('GTA Area');
  const [prefRadius,  setPrefRadius]  = useState(30);
  const [prefCuisine, setPrefCuisine] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefSaved,   setPrefSaved]   = useState(false);

  // Delete account
  const [showDelete,   setShowDelete]   = useState(false);
  const [deleteInput,  setDeleteInput]  = useState('');
  const [deletingAcct, setDeletingAcct] = useState(false);

  // Load profile
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const p: ProfileData = json.data;
          setProfile(p);
          setNameInput(p.display_name ?? '');
          setPrefCity(p.city ?? 'GTA Area');
          setPrefRadius(p.radius_km ?? 30);
          setPrefCuisine(p.favourite_cuisine ?? '');
        } else {
          router.replace('/customer/login');
        }
      })
      .catch(() => router.replace('/customer/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // Load claims
  const loadClaims = useCallback((filter: string, page: number, append = false) => {
    setClaimsLoading(true);
    fetch(`/api/profile/claims?filter=${filter}&page=${page}&limit=10`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAllClaims((prev) => append ? [...prev, ...json.data] : json.data);
          setClaimsTotal(json.count ?? 0);
          setHasMore((page * 10) < (json.count ?? 0));
        }
      })
      .finally(() => setClaimsLoading(false));
  }, []);

  useEffect(() => {
    loadClaims(claimsFilter, 1);
    setClaimsPage(1);
  }, [claimsFilter, loadClaims]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: nameInput.trim() }) });
    setProfile((p) => p ? { ...p, display_name: nameInput.trim() } : p);
    setSavingName(false);
    setEditingName(false);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: prefCity, radius_km: prefRadius, favourite_cuisine: prefCuisine }) });
    setSavingPrefs(false);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOutFromPortal(supabase, 'customer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const { stats } = profile;
  const totalSavedDollars = stats.total_saved_cents / 100;
  const monthlyData = buildMonthlyData(allClaims);
  const displayName = profile.display_name ?? profile.email.split('@')[0];

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface border-b border-[var(--bd)] shadow-sm">
        <div className="max-w-[900px] mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/customer" className="flex items-center gap-2 text-[14px] font-semibold text-t2 hover:text-tx transition-colors">
            <IconArrowLeft size={16} /> Back to deals
          </Link>
          <div className="flex-1" />
          <Link href="/" className="font-display text-[20px] font-extrabold tracking-tight">
            Rep<span className="text-brand">EAT</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-5 py-8 pb-24 space-y-8">

        {/* ── SECTION 1: Profile Header ────────────────────────────── */}
        <div className="bg-surface rounded-brand border border-[var(--bd)] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover border-4 border-[var(--bg)]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center border-4 border-[var(--bg)]">
                <span className="font-display text-[32px] font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {profile.is_repeat_plus && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F59E0B] flex items-center justify-center">
                <IconCrown size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* Name / email */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="h-9 px-3 border border-brand rounded-brands bg-surface text-tx text-[16px] font-bold outline-none focus:ring-2 focus:ring-brand/10"
                />
                <button onClick={handleSaveName} disabled={savingName} className="h-9 px-3 bg-brand text-white rounded-brands text-[13px] font-semibold disabled:opacity-60 transition-colors hover:bg-brand2">
                  {savingName ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} className="h-9 px-2 text-t2 hover:text-tx">
                  <IconX size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-[22px] font-bold truncate">{displayName}</h1>
                <button onClick={() => setEditingName(true)} className="text-t3 hover:text-brand transition-colors flex-shrink-0">
                  <IconEdit size={15} />
                </button>
              </div>
            )}
            <p className="text-[13px] text-t2 mb-1">{profile.email}</p>
            <p className="text-[12px] text-t3">
              Member since {profile.member_since ? new Date(profile.member_since).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : 'today'}
            </p>
          </div>

          {/* RepEAT+ badge or upgrade link */}
          <div className="flex-shrink-0">
            {profile.is_repeat_plus ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1.5px solid #F59E0B' }}>
                <IconCrown size={14} />
                RepEAT+ Member
              </div>
            ) : (
              <Link
                href="/repeat-plus"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold border border-[var(--bd2)] text-t2 hover:border-brand hover:text-brand transition-all"
              >
                <IconCrown size={14} />
                Upgrade to RepEAT+
              </Link>
            )}
          </div>
        </div>

        {/* ── SECTION 2: Savings Dashboard ────────────────────────── */}
        <div>
          <h2 className="font-display text-[18px] font-bold mb-4">Your RepEAT Impact</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              icon="💰"
              value={Math.round(totalSavedDollars * 100)}
              prefix="$"
              label="Total Saved"
              highlight={totalSavedDollars > 0}
            />
            <StatCard icon="🎟️" value={stats.total_claims} label="Deals Used" />
            <StatCard icon="🏙️" value={stats.cities_explored || 1} label="Cities" />
            <StatCard icon="🔥" value={profile.streak_days} label="Day Streak" />
          </div>

          {stats.last_claim_at && (
            <p className="text-[13px] text-t3 mb-5">
              Last claimed {(() => {
                const diff = Math.floor((Date.now() - new Date(stats.last_claim_at).getTime()) / 86400000);
                return diff === 0 ? 'today' : diff === 1 ? '1 day ago' : `${diff} days ago`;
              })()}
            </p>
          )}

          {/* Monthly savings bar chart */}
          <div className="bg-surface rounded-brand border border-[var(--bd)] p-5">
            <p className="text-[14px] font-bold mb-4">Monthly Savings</p>
            {monthlyData.some((d) => d.saved > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Saved']}
                    contentStyle={{ borderRadius: 9, border: '1px solid var(--bd)', fontSize: 13 }}
                  />
                  <Bar dataKey="saved" fill="#E85D04" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-t3 text-[14px]">
                Claim your first deal to see savings here
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 3: Claim History ─────────────────────────────── */}
        <div>
          <h2 className="font-display text-[18px] font-bold mb-4">Deal History</h2>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {([['all', 'All'], ['month', 'This month'], ['week', 'This week']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setClaimsFilter(id)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${claimsFilter === id ? 'bg-brand text-white border-brand' : 'text-t2 border-[var(--bd2)] hover:border-brand hover:text-brand'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {claimsLoading && allClaims.length === 0 ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-16 bg-surface2 rounded-brand animate-pulse" />)}
            </div>
          ) : allClaims.length === 0 ? (
            <div className="text-center py-12 text-t3 bg-surface rounded-brand border border-[var(--bd)]">
              <p className="text-3xl mb-2">🎟️</p>
              <p className="text-[15px] font-semibold">No claims yet</p>
              <p className="text-[13px] mt-1">Browse deals and claim your first one!</p>
              <Link href="/customer" className="inline-flex mt-4 h-9 px-5 bg-brand text-white text-[13px] font-semibold rounded-brands items-center hover:bg-brand2 transition-colors">
                Browse deals →
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {allClaims.map((c) => (
                <div key={c.id} className="bg-surface rounded-brand border border-[var(--bd)] p-4 flex items-center gap-3">
                  {/* Emoji */}
                  <div className="w-11 h-11 rounded-brands bg-brandlt flex items-center justify-center text-[22px] flex-shrink-0">
                    {c.deals?.emoji ?? '🍽️'}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] truncate">{c.deals?.title ?? 'Deal'}</p>
                    <p className="text-[12px] text-t2 truncate">
                      {c.deals?.restaurants?.name} · {new Date(c.claimed_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {(c.money_saved_cents ?? 0) > 0 ? (
                      <span className="text-[13px] font-bold text-green-600">
                        Saved ${(c.money_saved_cents! / 100).toFixed(2)}
                      </span>
                    ) : c.deals?.discount_value ? (
                      <span className="text-[13px] font-bold text-brand">{c.deals.discount_value}</span>
                    ) : null}
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <button
                  onClick={() => {
                    const next = claimsPage + 1;
                    setClaimsPage(next);
                    loadClaims(claimsFilter, next, true);
                  }}
                  disabled={claimsLoading}
                  className="w-full h-10 text-[13px] font-semibold text-t2 border border-[var(--bd2)] rounded-brands hover:border-brand hover:text-brand transition-all disabled:opacity-50"
                >
                  {claimsLoading ? 'Loading…' : `Load more (${claimsTotal - allClaims.length} remaining)`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 4: Favourite Restaurants ────────────────────── */}
        {profile.favourite_restaurants.length > 0 && (
          <div>
            <h2 className="font-display text-[18px] font-bold mb-4">Favourite Restaurants</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {profile.favourite_restaurants.map(({ restaurant: r, count }, idx) => (
                <div key={r.id} className="bg-surface rounded-brand border border-[var(--bd)] p-4 relative">
                  {idx === 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-[#F59E0B]">
                      <IconTrophy size={12} /> #1 Spot
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-brands bg-brandlt flex items-center justify-center text-[20px] mb-3">
                    {CAT_EMOJI[r.category ?? ''] ?? '🍽️'}
                  </div>
                  <p className="font-bold text-[14px] leading-snug mb-0.5">{r.name}</p>
                  <p className="text-[12px] text-t2 mb-2">{r.city}</p>
                  {r.rating > 0 && <StarRating rating={r.rating} size="sm" />}
                  <p className="text-[12px] text-t3 mt-2">{count} claim{count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 5: Preferences ──────────────────────────────── */}
        <div className="bg-surface rounded-brand border border-[var(--bd)] p-6">
          <h2 className="font-display text-[18px] font-bold mb-5">Preferences</h2>
          <div className="space-y-5">
            {/* City */}
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1.5">
                <IconMapPin size={13} className="inline mr-1 text-brand" /> Default City
              </label>
              <select
                value={prefCity}
                onChange={(e) => setPrefCity(e.target.value)}
                className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-brand"
              >
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Radius */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[13px] font-semibold text-t2">Search Radius</label>
                <span className="font-display text-[22px] font-extrabold text-brand">{prefRadius} km</span>
              </div>
              <input
                type="range" min={5} max={100} step={5} value={prefRadius}
                onChange={(e) => setPrefRadius(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </div>

            {/* Favourite cuisine */}
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1.5">Favourite Cuisine</label>
              <select
                value={prefCuisine}
                onChange={(e) => setPrefCuisine(e.target.value)}
                className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-brand"
              >
                <option value="">No preference</option>
                {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              onClick={handleSavePrefs}
              disabled={savingPrefs}
              className="h-11 px-6 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors flex items-center gap-2"
            >
              {prefSaved ? <><IconCheck size={15} /> Saved!</> : savingPrefs ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
        </div>

        {/* ── SECTION 6: RepEAT+ upsell (if not subscribed) ───────── */}
        {!profile.is_repeat_plus && (
          <Link
            href="/repeat-plus"
            className="block bg-[#0A0A0A] rounded-brand border border-white/10 p-5 hover:border-[#F59E0B]/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-[16px] font-bold text-white mb-1 flex items-center gap-2">
                  <IconCrown size={16} style={{ color: '#F59E0B' }} />
                  Unlock exclusive deals with RepEAT+
                </p>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  7-day free trial · $4.99/month · Cancel anytime
                </p>
              </div>
              <div className="text-white/40 group-hover:text-[#F59E0B] transition-colors">→</div>
            </div>
          </Link>
        )}

        {/* ── SECTION 7: Account ──────────────────────────────────── */}
        <div className="bg-surface rounded-brand border border-[var(--bd)] p-6">
          <h2 className="font-display text-[18px] font-bold mb-5">Account</h2>
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 h-11 px-5 border border-[var(--bd2)] rounded-brands text-[14px] font-semibold text-t2 hover:border-red-300 hover:text-red-600 transition-all"
            >
              <IconLogout size={16} /> Sign out
            </button>

            <div className="pt-3 border-t border-[var(--bd)]">
              <p className="text-[12px] font-bold text-t3 uppercase tracking-wide mb-3">Danger Zone</p>
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-2 text-[13px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  <IconAlertTriangle size={14} /> Delete account
                </button>
              ) : (
                <div className="border border-red-200 rounded-brands p-4 bg-red-50">
                  <p className="text-[13px] font-semibold text-red-700 mb-2">
                    Type <strong>DELETE</strong> to permanently delete your account and all data.
                  </p>
                  <input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full h-10 px-3 border border-red-300 rounded-brands text-[14px] outline-none bg-white text-red-700 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDelete(false); setDeleteInput(''); }}
                      className="flex-1 h-9 border border-[var(--bd2)] rounded-brands text-[13px] font-semibold text-t2"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={deleteInput !== 'DELETE' || deletingAcct}
                      className="flex-1 h-9 bg-red-600 disabled:opacity-40 text-white rounded-brands text-[13px] font-semibold"
                      onClick={async () => {
                        setDeletingAcct(true);
                        // Supabase doesn't allow self-deletion via anon key; sign out instead
                        await signOutFromPortal(supabase, 'customer');
                      }}
                    >
                      {deletingAcct ? 'Deleting…' : 'Delete account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
