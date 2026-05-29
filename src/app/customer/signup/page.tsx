'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconCheck, IconEye, IconEyeOff, IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

// ─── Google SVG ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.25-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Floating label input ─────────────────────────────────────────────────────
function FloatField({
  id, label, type = 'text', value, onChange, right, autoComplete,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; right?: React.ReactNode; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const up = focused || value.length > 0;
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="absolute left-4 pointer-events-none transition-all duration-150"
        style={{
          top:       up ? 8  : '50%',
          transform: up ? 'none' : 'translateY(-50%)',
          fontSize:  up ? 11 : 15,
          fontWeight: up ? 600 : 400,
          color:     focused ? '#E85D04' : '#9CA3AF',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        className="w-full rounded-xl bg-white text-[#111] text-[15px] outline-none transition-all"
        style={{
          height: 56,
          paddingTop: 20,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: right ? 44 : 16,
          border: focused ? '2px solid #E85D04' : '1.5px solid #E5E7EB',
          boxShadow: focused ? '0 0 0 3px rgba(232,93,4,0.1)' : undefined,
        }}
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
      )}
    </div>
  );
}

// ─── Password strength meter ──────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number or symbol', pass: /[0-9!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['#E5E7EB', '#EF4444', '#F59E0B', '#22C55E'];
  const labels = ['', 'Weak', 'Fair', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: score >= i ? colors[score] : '#E5E7EB' }}
          />
        ))}
      </div>
      {/* Label + checks */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className="text-[11px] flex items-center gap-1 transition-colors"
              style={{ color: c.pass ? '#16a34a' : '#9CA3AF' }}
            >
              <IconCheck size={10} />
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className="text-[11px] font-semibold" style={{ color: colors[score] }}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="transition-all duration-300 rounded-full"
          style={{
            width:  i === step ? 24 : 8,
            height: 8,
            background: i <= step ? '#E85D04' : '#E5E7EB',
          }}
        />
      ))}
      <span className="ml-1 text-[12px] font-medium text-gray-400">
        Step {step + 1} of {total}
      </span>
    </div>
  );
}

// ─── Ontario cities ───────────────────────────────────────────────────────────
const ONTARIO_CITIES = [
  'Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan',
  'Richmond Hill', 'Oakville', 'Burlington', 'Hamilton',
  'Waterloo', 'Kitchener', 'Cambridge', 'London', 'Windsor', 'Ottawa',
];

// ─── Main signup page ─────────────────────────────────────────────────────────
export default function CustomerSignupPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0); // 0=personal, 1=location, 2=password

  // Step 0 fields
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');

  // Step 1 fields
  const [city,    setCity]    = useState('');
  const [cuisine, setCuisine] = useState('');

  // Step 2 fields
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Step validation
  const canNext = [
    name.trim().length >= 2 && isEmailValid,
    true, // location optional
    password.length >= 6 && password === confirm,
  ];

  const handleGoogle = async () => {
    localStorage.setItem('rp_portal', 'customer')
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleNext = () => {
    setError('');
    if (step < 2) { setStep(step + 1); return; }

    // Final submit
    void (async () => {
      setLoading(true);
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, city, favourite_cuisine: cuisine, role: 'customer' },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (authErr) {
        setError(authErr.message.includes('already registered')
          ? 'That email is already registered. Sign in instead?'
          : authErr.message);
        return;
      }
      // Auto-confirm enabled → session exists, go straight to portal
      if (authData?.session) {
        router.push('/customer');
      } else {
        router.push(`/customer/verify-email?email=${encodeURIComponent(email)}`);
      }
    })();
  };

  const CUISINES = ['Indian', 'Italian', 'Japanese', 'Chinese', 'Mexican', 'Thai', 'BBQ', 'Pizza', 'Vegan', 'Seafood'];

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0D0D' }}>

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#111' }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,93,4,0.12) 0%, transparent 70%)',
            top: '30%', left: '-15%', filter: 'blur(50px)',
          }}
        />

        {/* Back link */}
        <Link href="/customer/login" className="inline-flex items-center gap-2 text-[13px] font-medium z-10"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          ← Back to sign in
        </Link>

        {/* Center copy */}
        <div className="flex-1 flex flex-col justify-center z-10 space-y-6">
          <div>
            <p className="font-display text-[32px] font-extrabold text-white leading-tight mb-3">
              Free deals,<br />every week
            </p>
            <p className="text-[15px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Join 5,000+ Ontario foodies saving money on their favourite restaurants.
            </p>
          </div>

          {/* Benefits */}
          {[
            { emoji: '🎟️', text: 'Claim exclusive deals not available anywhere else' },
            { emoji: '📍', text: 'Deals near you, filtered by city and cuisine' },
            { emoji: '🏆', text: 'Track savings and build your streak' },
            { emoji: '⚡', text: 'New deals every week from local restaurants' },
          ].map((b) => (
            <div key={b.text} className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{b.emoji}</span>
              <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{b.text}</p>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="z-10 text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Free forever · No credit card required
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0D0D0D' }}>
        <div
          className="w-full max-w-[440px] rounded-2xl p-8"
          style={{ background: '#fff', borderTop: '4px solid #E85D04', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
        >
          {/* Logo */}
          <div className="mb-5">
            <div className="font-display text-[28px] font-extrabold tracking-tight leading-none mb-1">
              Rep<span style={{ color: '#E85D04' }}>EAT</span>
            </div>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Create your free account</p>
          </div>

          <StepDots step={step} total={3} />

          {/* ── Step 0: Personal details ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-[17px] font-bold text-gray-900 mb-1">Tell us about yourself</p>
                    <p className="text-[13px] text-gray-500">Just the basics to get started.</p>
              </div>

              {/* Google quick-signup */}
              <button
                onClick={handleGoogle}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#111' }}
              >
                <GoogleIcon /> Sign up with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
                <span className="text-[12px] font-medium" style={{ color: '#9CA3AF' }}>or with email</span>
                <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
              </div>

              <FloatField
                id="su-name" label="Full name" value={name} onChange={setName}
                autoComplete="name"
              />
              <FloatField
                id="su-email" label="Email address" type="email" value={email} onChange={setEmail}
                autoComplete="email"
                right={isEmailValid && email.length > 0
                  ? <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <IconCheck size={11} className="text-white" />
                    </div>
                  : null}
              />
            </div>
          )}

          {/* ── Step 1: Location preferences ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-[17px] font-bold text-gray-900 mb-1">Where are you based?</p>
                <p className="text-[13px] text-gray-500">We&apos;ll show deals near you. You can change this later.</p>
              </div>

              {/* City select */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">City</label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 rounded-xl text-[15px] text-gray-800 outline-none appearance-none transition-all"
                    style={{ border: '1.5px solid #E5E7EB', background: '#fff' }}
                  >
                    <option value="">Pick your city</option>
                    {ONTARIO_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ▾
                  </div>
                </div>
              </div>

              {/* Cuisine preference chips */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-2 ml-1">
                  Favourite cuisine <span className="font-normal text-gray-300">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCuisine(cuisine === c ? '' : c)}
                      className="h-8 px-3.5 rounded-full text-[13px] font-semibold border transition-all"
                      style={cuisine === c
                        ? { background: '#E85D04', color: '#fff', borderColor: '#E85D04' }
                        : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[12px] text-gray-400">
                You can skip this step — location and cuisine can be set in your profile later.
              </p>
            </div>
          )}

          {/* ── Step 2: Password ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-[17px] font-bold text-gray-900 mb-1">Create a password</p>
                <p className="text-[13px] text-gray-500">Make it strong &mdash; your deals account is worth protecting.</p>
              </div>

              <div className="space-y-2">
                <FloatField
                  id="su-pw" label="Password" type={showPw ? 'text' : 'password'}
                  value={password} onChange={setPassword}
                  autoComplete="new-password"
                  right={
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </button>
                  }
                />
                <PasswordStrength password={password} />
              </div>

              <FloatField
                id="su-conf" label="Confirm password" type={showConf ? 'text' : 'password'}
                value={confirm} onChange={setConfirm}
                autoComplete="new-password"
                right={
                  confirm.length > 0
                    ? confirm === password
                      ? <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <IconCheck size={11} className="text-white" />
                        </div>
                      : <button type="button" onClick={() => setShowConf((v) => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          {showConf ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </button>
                    : null
                }
              />

              {confirm.length > 0 && confirm !== password && (
                <p className="text-[12px] text-red-500">Passwords don&apos;t match</p>
              )}

              {/* Recap */}
              <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: '#FFF7F0', border: '1px solid #FFD9B8' }}>
                <p className="text-[12px] font-semibold text-orange-700">Creating account for:</p>
                <p className="text-[13px] text-gray-700 font-medium">{name}</p>
                <p className="text-[12px] text-gray-500">{email}</p>
                {city && <p className="text-[12px] text-gray-500">{city}{cuisine ? ` · ${cuisine}` : ''}</p>}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 px-4 py-3 rounded-xl text-[13px] font-medium" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className={`flex mt-5 gap-3 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
            {step > 0 && (
              <button
                onClick={() => { setStep(step - 1); setError(''); }}
                className="h-12 px-5 rounded-xl border font-semibold text-[14px] flex items-center gap-2 transition-all hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                <IconArrowLeft size={16} /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canNext[step] || loading}
              className="flex-1 h-12 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#E85D04' }}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : step === 2 ? (
                'Create account'
              ) : (
                <> {step === 0 ? 'Continue' : 'Continue'} <IconArrowRight size={16} /> </>
              )}
            </button>
          </div>

          {/* Sign in link */}
          <p className="text-center text-[13px] mt-4" style={{ color: '#6B7280' }}>
            Already have an account?{' '}
            <Link href="/customer/login" className="font-semibold hover:underline" style={{ color: '#E85D04' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
