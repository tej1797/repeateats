'use client';

// Customer Profile — mobile parity (dark theme)
// Sections: avatar header · View plans · stat grid · Points + Saved cards · Account list · Switch portal / Sign out

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconCrown, IconCamera, IconStar, IconHeart, IconChevronRight,
  IconUser, IconDeviceMobile, IconMapPin, IconMail,
  IconArrowsLeftRight, IconLogout, IconCheck, IconSparkles,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import CustomerPortalHeader from '@/components/customer/CustomerPortalHeader';
import LocationModal from '@/components/customer/LocationModal';
import { usePlan } from '@/hooks/usePlan';
import { useCustomerLocation } from '@/hooks/useCustomerLocation';
import { CUSTOMER_UI } from '@/lib/customerUI';

interface ProfileData {
  id:                string;
  email:             string;
  display_name:      string | null;
  avatar_url:        string | null;
  phone:             string | null;
  member_since:      string | null;
  is_repeat_plus:    boolean;
  tier:              string;
  city:              string | null;
  radius_km:         number;
  points_balance:    number;
  saved_count:       number;
  stats: {
    total_claims:       number;
    total_saved_cents:  number;
    claims_this_month:  number;
    unique_deals:       number;
    cities_explored:    number;
    last_claim_at:      string | null;
  };
}

function StatCard({ value, label, color, prefix = '', suffix = '' }: {
  value: number | string; label: string; color: string; prefix?: string; suffix?: string;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-5 text-center"
      style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
    >
      <p className="font-display text-[30px] font-extrabold leading-none mb-1.5" style={{ color }}>
        {prefix}{value}{suffix}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CUSTOMER_UI.textMuted }}>
        {label}
      </p>
    </div>
  );
}

function AccountRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: CUSTOMER_UI.textSecondary }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CUSTOMER_UI.textMuted }}>{label}</p>
        <p className="text-[14px] font-semibold truncate" style={{ color: CUSTOMER_UI.textPrimary }}>{value || '—'}</p>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;
  const fileRef  = useRef<HTMLInputElement>(null);

  const plan = usePlan();
  const { city, radius, applyLocation } = useCustomerLocation();
  const [showLocation, setShowLocation] = useState(false);
  const [dietFilter, setDietFilter] = useState<'veg' | 'all'>('veg');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [editing,   setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setProfile(json.data);
          setNameInput(json.data.display_name ?? '');
          setPhoneInput(json.data.phone ?? '');
        } else {
          router.replace('/customer/login');
        }
      })
      .catch(() => router.replace('/customer/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: nameInput.trim(), phone: phoneInput.trim() }),
    });
    setProfile(p => p ? { ...p, display_name: nameInput.trim(), phone: phoneInput.trim() } : p);
    setSaving(false);
    setEditing(false);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path);
      const busted = `${publicUrl}?t=${Date.now()}`;
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: busted }),
      });
      setProfile(p => p ? { ...p, avatar_url: busted } : p);
    } catch {
      alert('Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/customer/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CUSTOMER_UI.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CUSTOMER_UI.accent }} />
      </div>
    );
  }
  if (!profile) return null;

  const displayName = profile.display_name ?? profile.email.split('@')[0];
  const initials    = displayName.charAt(0).toUpperCase();
  const estSaved    = (profile.stats.total_saved_cents ?? 0) / 100;

  return (
    <div className="min-h-screen pb-8" style={{ background: CUSTOMER_UI.bg, color: CUSTOMER_UI.textPrimary }}>
      {!plan.loading && (
        <CustomerPortalHeader
          city={city}
          radiusKm={radius}
          tier={plan.tier}
          dailyUsed={plan.daily_used}
          effectiveDailyCap={plan.effective_daily_cap}
          pointsBalance={plan.points_balance}
          vegMode={dietFilter === 'veg'}
          onVegModeChange={(veg) => setDietFilter(veg ? 'veg' : 'all')}
          onLocationClick={() => setShowLocation(true)}
        />
      )}

      <main className="max-w-[700px] mx-auto px-4 py-2 space-y-5">

        {/* Avatar card */}
        <div className="rounded-2xl px-5 py-6 text-center" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
          <div className="relative inline-block">
            <button onClick={() => fileRef.current?.click()} className="relative block">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={displayName} className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: CUSTOMER_UI.accent }}>
                  <span className="font-display text-[36px] font-bold text-white">{initials}</span>
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: CUSTOMER_UI.bgElevated, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
                <IconCamera size={14} style={{ color: CUSTOMER_UI.textSecondary }} />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
          </div>
          <p className="text-[12px] mt-2" style={{ color: CUSTOMER_UI.textMuted }}>
            {uploading ? 'Uploading…' : 'Tap to change photo'}
          </p>

          <h1 className="font-display text-[22px] font-extrabold mt-2 flex items-center justify-center gap-1.5">
            {displayName}
            {profile.is_repeat_plus && <IconCrown size={18} fill={CUSTOMER_UI.gold} color={CUSTOMER_UI.gold} />}
          </h1>
          <p className="text-[13px]" style={{ color: CUSTOMER_UI.textSecondary }}>{profile.email}</p>

          {profile.is_repeat_plus ? (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-full text-[13px] font-bold" style={{ border: `1px solid ${CUSTOMER_UI.gold}`, color: CUSTOMER_UI.gold }}>
              <IconSparkles size={14} /> RepEAT+ Member
            </span>
          ) : (
            <Link href="/repeat-plus" className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-full text-[13px] font-bold" style={{ border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}>
              <IconCrown size={14} /> Upgrade to RepEAT+
            </Link>
          )}
        </div>

        {/* View plans button */}
        <Link
          href="/repeat-plus"
          className="flex items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold"
          style={{ border: `1px solid ${CUSTOMER_UI.gold}`, color: CUSTOMER_UI.gold }}
        >
          View plans &amp; subscription →
        </Link>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={profile.saved_count} label="Saved" color={CUSTOMER_UI.claimBlue} />
          <StatCard value={profile.stats.total_claims} label="Claimed" color={CUSTOMER_UI.accent} />
          <StatCard value={profile.stats.claims_this_month} label="This month" color="#22C55E" />
          <StatCard value={estSaved > 0 ? `$${estSaved.toFixed(0)}` : '0¢'} label="Est. saved" color={CUSTOMER_UI.gold} />
        </div>

        {/* Points card */}
        <Link href="/customer/points" className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: CUSTOMER_UI.accentSoft, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,0,0.2)' }}>
            <IconStar size={18} style={{ color: CUSTOMER_UI.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px]">RepEAT Points</p>
            <p className="text-[12px]" style={{ color: CUSTOMER_UI.textSecondary }}>{profile.points_balance} pts · earn on every QR scan</p>
          </div>
          <IconChevronRight size={16} style={{ color: CUSTOMER_UI.textMuted }} />
        </Link>

        {/* Saved deals card */}
        <Link href="/customer?tab=saved" className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,0,0.12)' }}>
            <IconHeart size={18} style={{ color: CUSTOMER_UI.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px]">Saved deals</p>
            <p className="text-[12px]" style={{ color: CUSTOMER_UI.textSecondary }}>{profile.saved_count} active deal{profile.saved_count !== 1 ? 's' : ''}</p>
          </div>
          <IconChevronRight size={16} style={{ color: CUSTOMER_UI.textMuted }} />
        </Link>

        {/* Account */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CUSTOMER_UI.textMuted }}>Account</p>
            <button onClick={() => setEditing(v => !v)} className="text-[13px] font-bold" style={{ color: CUSTOMER_UI.accent }}>
              {editing ? 'Close' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CUSTOMER_UI.textMuted }}>Name</label>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full h-11 mt-1 px-3 rounded-xl text-[14px] outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary }}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CUSTOMER_UI.textMuted }}>Phone</label>
                <input
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="Add phone number"
                  className="w-full h-11 mt-1 px-3 rounded-xl text-[14px] outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary }}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: CUSTOMER_UI.accent }}
              >
                {saving ? 'Saving…' : <><IconCheck size={16} /> Save changes</>}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl divide-y" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
              <div style={{ borderColor: CUSTOMER_UI.glassBorder }}><AccountRow icon={<IconUser size={16} />} label="Name" value={displayName} /></div>
              <div style={{ borderColor: CUSTOMER_UI.glassBorder }} className="border-t"><AccountRow icon={<IconDeviceMobile size={16} />} label="Phone" value={profile.phone ?? ''} /></div>
              <div style={{ borderColor: CUSTOMER_UI.glassBorder }} className="border-t"><AccountRow icon={<IconMapPin size={16} />} label="City" value={profile.city ?? 'GTA Area'} /></div>
              <div style={{ borderColor: CUSTOMER_UI.glassBorder }} className="border-t"><AccountRow icon={<IconMail size={16} />} label="Email" value={profile.email} /></div>
            </div>
          )}
        </div>

        {/* Other */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-2 px-1" style={{ color: CUSTOMER_UI.textMuted }}>Other</p>
          <div className="rounded-2xl" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
            <Link href="/" className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: CUSTOMER_UI.glassBorder }}>
              <IconArrowsLeftRight size={18} style={{ color: CUSTOMER_UI.textSecondary }} />
              <span className="flex-1 text-[14px] font-semibold">Switch portal</span>
              <IconChevronRight size={16} style={{ color: CUSTOMER_UI.textMuted }} />
            </Link>
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3.5">
              <IconLogout size={18} style={{ color: '#f87171' }} />
              <span className="flex-1 text-left text-[14px] font-semibold" style={{ color: '#f87171' }}>Sign out</span>
              <IconChevronRight size={16} style={{ color: CUSTOMER_UI.textMuted }} />
            </button>
          </div>
        </div>
      </main>

      {showLocation && (
        <LocationModal
          city={city}
          radius={radius}
          onApply={applyLocation}
          onClose={() => setShowLocation(false)}
        />
      )}
    </div>
  );
}
