'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  IconArrowLeft, IconArrowRight, IconCheck,
  IconEye, IconEyeOff, IconBrandInstagram, IconBrandTiktok,
} from '@tabler/icons-react';

// ─── Step dots ────────────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="transition-all duration-300 rounded-full"
          style={{ width: i === step ? 24 : 8, height: 8, background: i <= step ? '#7E22CE' : '#E5E7EB' }} />
      ))}
      <span className="ml-1 text-[12px] font-medium text-gray-400">Step {step + 1} of {total}</span>
    </div>
  );
}

// ─── Floating label input ─────────────────────────────────────────────────────
function FloatField({
  id, label, type = 'text', value, onChange, right, note,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; right?: React.ReactNode; note?: string;
}) {
  const [focused, setFocused] = useState(false);
  const up = focused || value.length > 0;
  return (
    <div>
      <div className="relative">
        <label htmlFor={id} className="absolute left-4 pointer-events-none transition-all duration-150"
          style={{
            top: up ? 8 : '50%', transform: up ? 'none' : 'translateY(-50%)',
            fontSize: up ? 11 : 15, fontWeight: up ? 600 : 400,
            color: focused ? '#7E22CE' : '#9CA3AF',
          }}>
          {label}
        </label>
        <input id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="w-full rounded-xl bg-white text-[#111] text-[15px] outline-none transition-all"
          style={{
            height: 56, paddingTop: 20, paddingBottom: 8, paddingLeft: 16,
            paddingRight: right ? 44 : 16,
            border: focused ? '2px solid #7E22CE' : '1.5px solid #E5E7EB',
            boxShadow: focused ? '0 0 0 3px rgba(126,34,206,0.1)' : undefined,
          }} />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {note && <p className="text-[11px] text-gray-400 mt-1 ml-1">{note}</p>}
    </div>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
function PwStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number/symbol', pass: /[0-9!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  if (!password) return null;
  const colors = ['#E5E7EB', '#EF4444', '#F59E0B', '#22C55E'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[1,2,3].map((i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: score >= i ? colors[score] : '#E5E7EB' }} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span key={c.label} className="text-[11px] flex items-center gap-1 transition-colors"
            style={{ color: c.pass ? '#16a34a' : '#9CA3AF' }}>
            <IconCheck size={9} /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const NICHES = [
  { emoji: '🍽️', label: 'Food & Dining' },
  { emoji: '🌮', label: 'Street Food' },
  { emoji: '🍣', label: 'Fine Dining' },
  { emoji: '☕', label: 'Café & Desserts' },
  { emoji: '🍹', label: 'Cocktails & Bar' },
  { emoji: '🌱', label: 'Vegan & Healthy' },
  { emoji: '🔥', label: 'BBQ & Grills' },
  { emoji: '🍕', label: 'Pizza & Italian' },
];

const FOLLOWER_RANGES = ['Under 1K', '1K–5K', '5K–10K', '10K–25K', '25K–50K', '50K–100K', '100K+'];
const PLATFORMS = ['Instagram', 'TikTok', 'Both', 'YouTube', 'Other'];
const ONTARIO_CITIES = [
  'Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan',
  'Richmond Hill', 'Oakville', 'Burlington', 'Hamilton',
  'Waterloo', 'Kitchener', 'Cambridge', 'London', 'Ottawa',
];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreatorSignupPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);

  // Step 0 — Identity
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [igHandle, setIgHandle] = useState('');
  const [ttHandle, setTtHandle] = useState('');

  // Step 1 — Audience
  const [niches,       setNiches]       = useState<string[]>([]);
  const [followerRange, setFollowerRange] = useState('');
  const [platform,     setPlatform]     = useState('');
  const [city,         setCity]         = useState('');
  const [bio,          setBio]          = useState('');

  // Step 2 — Password
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [agreed,    setAgreed]    = useState(false);

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Instagram handle verification (format-only, no server fetch)
  const [igStatus, setIgStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const igDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = igHandle.replace(/^@+/, '').trim();
    if (raw.length < 2) { setIgStatus('idle'); return; }
    setIgStatus('checking');
    if (igDebounce.current) clearTimeout(igDebounce.current);
    igDebounce.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/verify-instagram?handle=${encodeURIComponent(raw)}`);
        const json = await res.json() as { valid: boolean };
        setIgStatus(json.valid ? 'valid' : 'invalid');
      } catch { setIgStatus('valid'); } // format check failed — assume ok
    }, 800);
    return () => { if (igDebounce.current) clearTimeout(igDebounce.current); };
  }, [igHandle]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const normaliseHandle = (v: string) => (v && !v.startsWith('@') ? `@${v}` : v);

  const canNext = [
    name.trim().length >= 2 && isEmailValid && igHandle.length >= 2,
    true, // audience optional
    password.length >= 6 && password === confirm && agreed,
  ];

  const handleNext = () => {
    setError('');
    if (step < 2) { setStep(step + 1); return; }

    void (async () => {
      setLoading(true);
      const handle = normaliseHandle(igHandle);

      const profilePayload = {
        instagram_handle:   handle,
        tiktok_handle:      ttHandle ? normaliseHandle(ttHandle) : null,
        niche:              niches.join(', ') || null,
        follower_range:     followerRange || null,
        primary_platform:   platform || null,
        city:               city || null,
        bio:                bio || null,
        rating:             0,
        total_collabs:      0,
        instagram_verified: false,
      };

      // Store portal + profile for post-email-confirmation creation
      localStorage.setItem('rp_portal', 'influencer');
      localStorage.setItem('rp_pending_influencer', JSON.stringify(profilePayload));

      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role: 'influencer' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authErr) {
        setError(authErr.message.includes('already registered')
          ? 'That email is already registered. Sign in instead.'
          : authErr.message);
        setLoading(false);
        return;
      }

      // 2. Create influencer profile row (only works if session exists — auto-confirm ON)
      if (authData.session && authData.user) {
        await supabase.from('influencers').upsert(
          { user_id: authData.user.id, ...profilePayload },
          { onConflict: 'user_id' }
        );
        localStorage.removeItem('rp_pending_influencer');
      }

      setLoading(false);
      if (authData.session) {
        router.push('/influencer');
      } else {
        router.push(`/influencer/verify-email?email=${encodeURIComponent(email)}`);
      }
    })();
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0D0D' }}>

      {/* Left panel */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#0e0a1a' }}>
        <div className="pointer-events-none absolute"
          style={{ width: 380, height: 380, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(126,34,206,0.2) 0%, transparent 70%)',
            top: '25%', left: '-15%', filter: 'blur(50px)' }} />

        <a href="/influencer" className="text-[13px] z-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
          ← Back to sign in
        </a>

        <div className="flex-1 flex flex-col justify-center z-10 space-y-6">
          <div>
            <p className="font-display text-[30px] font-extrabold text-white leading-tight mb-2">
              Turn your food<br />content into income
            </p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Join Ontario&apos;s first creator-to-restaurant<br />marketplace. Free to join, forever.
            </p>
          </div>

          {[
            { emoji: '🤝', text: 'Direct collabs with restaurants — no middleman' },
            { emoji: '💰', text: 'Earn $120–$350 per collab on average' },
            { emoji: '🔒', text: 'Payment held in escrow until content approved' },
            { emoji: '⚡', text: '2% platform fee only — taken from your payout' },
          ].map((b) => (
            <div key={b.text} className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{b.emoji}</span>
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{b.text}</p>
            </div>
          ))}
        </div>

        <p className="z-10 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Free forever · No monthly fees
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0D0D0D' }}>
        <div className="w-full max-w-[460px] rounded-2xl p-8"
          style={{ background: '#fff', borderTop: '4px solid #7E22CE', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>

          <div className="mb-5">
            <div className="font-display text-[26px] font-extrabold tracking-tight leading-none mb-1">
              Rep<span style={{ color: '#E85D04' }}>EAT</span>
              <span className="text-[16px] font-semibold text-gray-400 ml-2">Creator</span>
            </div>
            <p className="text-[13px] text-gray-500">Create your free creator account</p>
          </div>

          <StepDots step={step} total={3} />

          {/* ── Step 0: Creator identity ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-[17px] font-bold text-gray-900 mb-1">Your creator identity</p>
                <p className="text-[13px] text-gray-500">Tell us who you are and where to find you.</p>
              </div>
              <FloatField id="cr-name" label="Full name *" value={name} onChange={setName} />
              <FloatField id="cr-email" label="Email address *" type="email" value={email} onChange={setEmail}
                right={isEmailValid && email.length > 0
                  ? <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <IconCheck size={11} className="text-white" />
                    </div>
                  : null} />

              <div className="space-y-2">
                <FloatField id="cr-ig" label="Instagram handle * (@yourusername)" value={igHandle}
                  onChange={(v) => setIgHandle(v.startsWith('@') ? v : v ? `@${v}` : '')}
                  right={<IconBrandInstagram size={18} className="text-pink-500" />} />
                {/* IG verification status */}
                {igHandle.length > 1 && (
                  <div>
                    {igStatus === 'checking' && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium"
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
                        <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                        Checking...
                      </div>
                    )}
                    {igStatus === 'valid' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold"
                          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
                          <IconCheck size={13} />
                          {igHandle} — looks good! We&apos;ll verify after you sign up.
                        </div>
                        <a href={`https://instagram.com/${igHandle.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium ml-1 hover:underline"
                          style={{ color: '#7E22CE' }}>
                          <IconBrandInstagram size={11} />
                          Preview: instagram.com/{igHandle.replace('@','')} ↗
                        </a>
                      </div>
                    )}
                    {igStatus === 'invalid' && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold"
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                        <IconBrandInstagram size={13} />
                        Invalid format — use letters, numbers, periods, underscores only
                      </div>
                    )}
                    {igStatus === 'idle' && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{ background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', color: '#fff' }}>
                        <IconBrandInstagram size={13} />
                        {igHandle}
                      </div>
                    )}
                  </div>
                )}
                <FloatField id="cr-tt" label="TikTok handle (optional)" value={ttHandle}
                  onChange={(v) => setTtHandle(v.startsWith('@') ? v : v ? `@${v}` : '')}
                  right={<IconBrandTiktok size={18} className="text-gray-700" />} />
              </div>
            </div>
          )}

          {/* ── Step 1: Audience ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-[17px] font-bold text-gray-900 mb-1">Your audience</p>
                <p className="text-[13px] text-gray-500">Help restaurants find the right fit. All optional.</p>
              </div>

              {/* Niche multi-select */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-2 ml-1">Primary niche</label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => {
                    const active = niches.includes(n.label);
                    return (
                      <button key={n.label} type="button"
                        onClick={() => setNiches(active ? niches.filter((x) => x !== n.label) : [...niches, n.label])}
                        className="h-8 px-3 rounded-full text-[12px] font-semibold border transition-all"
                        style={active
                          ? { background: '#7E22CE', color: '#fff', borderColor: '#7E22CE' }
                          : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}>
                        {n.emoji} {n.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Follower range */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">Follower count</label>
                <div className="flex flex-wrap gap-2">
                  {FOLLOWER_RANGES.map((r) => (
                    <button key={r} type="button" onClick={() => setFollowerRange(followerRange === r ? '' : r)}
                      className="h-8 px-3 rounded-full text-[12px] font-semibold border transition-all"
                      style={followerRange === r
                        ? { background: '#7E22CE', color: '#fff', borderColor: '#7E22CE' }
                        : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">Primary platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button key={p} type="button" onClick={() => setPlatform(platform === p ? '' : p)}
                      className="h-8 px-3 rounded-full text-[12px] font-semibold border transition-all"
                      style={platform === p
                        ? { background: '#7E22CE', color: '#fff', borderColor: '#7E22CE' }
                        : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">City / Area</label>
                <select value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 rounded-xl text-[14px] text-gray-700 outline-none appearance-none"
                  style={{ border: '1.5px solid #E5E7EB', background: '#fff' }}>
                  <option value="">Select your city</option>
                  {ONTARIO_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">
                  Short bio <span className="font-normal text-gray-300">({bio.length}/150)</span>
                </label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} rows={3}
                  placeholder="Toronto-based food creator obsessed with hidden gems and South Asian cuisine"
                  className="w-full px-4 py-3 rounded-xl text-[14px] text-gray-800 outline-none resize-none transition-all"
                  style={{ border: '1.5px solid #E5E7EB' }} />
              </div>
            </div>
          )}

          {/* ── Step 2: Password ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-[17px] font-bold text-gray-900 mb-1">Secure your account</p>
                <p className="text-[13px] text-gray-500">Create a strong password for your creator account.</p>
              </div>

              <div className="space-y-2">
                <FloatField id="cr-pw" label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={setPassword}
                  right={<button type="button" onClick={() => setShowPw((v) => !v)} className="text-gray-400 hover:text-gray-600">
                    {showPw ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>} />
                <PwStrength password={password} />
              </div>

              <FloatField id="cr-conf" label="Confirm password" type={showConf ? 'text' : 'password'} value={confirm} onChange={setConfirm}
                right={confirm.length > 0 && confirm === password
                  ? <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <IconCheck size={11} className="text-white" />
                    </div>
                  : <button type="button" onClick={() => setShowConf((v) => !v)} className="text-gray-400 hover:text-gray-600">
                      {showConf ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>} />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-[12px] text-red-500">Passwords don&apos;t match</p>
              )}

              {/* Account recap */}
              <div className="rounded-xl p-3.5 space-y-1" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <p className="text-[11px] font-semibold text-purple-700">Creating creator account for:</p>
                <p className="text-[13px] font-bold text-gray-800">{name}</p>
                <p className="text-[12px] text-gray-500">{email}</p>
                <p className="text-[12px] text-gray-500">{igHandle}</p>
              </div>

              {/* Creator agreement */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-purple-700 flex-shrink-0" />
                <span className="text-[12px] text-gray-500 leading-relaxed">
                  I agree to RepEAT&apos;s Creator Terms — I will only post authentic content as agreed with each restaurant.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="mt-3 px-4 py-3 rounded-xl text-[13px] font-medium"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {/* Nav buttons */}
          <div className={`flex mt-5 gap-3 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
            {step > 0 && (
              <button onClick={() => { setStep(step - 1); setError(''); }}
                className="h-12 px-5 rounded-xl border font-semibold text-[14px] flex items-center gap-2 hover:bg-gray-50 transition-all"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                <IconArrowLeft size={16} /> Back
              </button>
            )}
            <button onClick={handleNext} disabled={!canNext[step] || loading}
              className="flex-1 h-12 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#7E22CE' }}>
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : step === 2
                ? 'Create creator account'
                : <>{step === 0 ? 'Continue' : 'Continue'} <IconArrowRight size={16} /></>}
            </button>
          </div>

          <p className="text-center text-[13px] mt-4" style={{ color: '#6B7280' }}>
            Already have an account?{' '}
            <a href="/influencer" className="font-semibold hover:underline" style={{ color: '#7E22CE' }}>
              Sign in →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
