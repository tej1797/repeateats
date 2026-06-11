'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function RestaurantVerifyEmailContent() {
  const supabase = createClient();
  const router   = useRouter();
  const searchParams = useSearchParams();

  const [cooldown, setCooldown] = useState(0);
  const [resent,   setResent]   = useState(false);
  const [email,    setEmail]    = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      return;
    }
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, [supabase, searchParams]);

  // Poll every 3 s — redirect once email is confirmed
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        router.push('/restaurant');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [supabase, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    await supabase.auth.resend({ type: 'signup', email });
    setResent(true);
    setCooldown(30);
  }, [email, cooldown, supabase]);

  const GREEN = '#1249A9';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#0D0D0D' }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(18,73,169,0.12) 0%, transparent 70%)',
          top: '20%', left: '50%', transform: 'translateX(-50%)',
          filter: 'blur(60px)',
        }}
      />

      <div
        className="relative w-full max-w-[420px] rounded-2xl p-8 text-center"
        style={{ background: '#fff', borderTop: `4px solid ${GREEN}`, boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
      >
        <div className="font-display text-[24px] font-extrabold tracking-tight leading-none mb-6">
          Rep<span style={{ color: '#E85D04' }}>EAT</span>
        </div>

        {/* Envelope */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center text-5xl transition-all duration-500"
            style={{
              background: resent ? 'linear-gradient(135deg, #EAF1FB, #D8E5FA)' : '#F9FAFB',
              border: `2px solid ${resent ? '#6EE7B7' : '#E5E7EB'}`,
              boxShadow: resent ? '0 0 40px rgba(18,73,169,0.2)' : undefined,
            }}
          >
            {resent ? '📨' : '✉️'}
          </div>
          {resent && (
            <div
              className="absolute inset-0 rounded-2xl animate-ping"
              style={{ border: `2px solid rgba(18,73,169,0.3)` }}
            />
          )}
        </div>

        <h1 className="text-[22px] font-extrabold text-gray-900 mb-2">Check your inbox</h1>
        <p className="text-[14px] text-gray-500 mb-1">We sent a verification link to</p>
        {email && <p className="text-[15px] font-semibold text-gray-800 mb-4">{email}</p>}
        <p className="text-[13px] text-gray-400 mb-6">
          Click the link to activate your restaurant account and set up your listing.
        </p>

        <button
          onClick={handleResend}
          disabled={cooldown > 0 || !email}
          className="w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center transition-all disabled:cursor-not-allowed"
          style={{
            background: cooldown > 0 ? '#F9FAFB' : resent ? '#EAF1FB' : GREEN,
            color: cooldown > 0 ? '#9CA3AF' : resent ? GREEN : '#fff',
            border: cooldown > 0 || resent ? '1.5px solid #E5E7EB' : 'none',
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resent ? 'Email sent! ✓' : 'Resend verification email'}
        </button>

        <div
          className="mt-5 rounded-xl p-4 text-left space-y-1.5"
          style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}
        >
          <p className="text-[12px] font-semibold text-gray-500 mb-2">Can&apos;t find the email?</p>
          {[
            'Check your spam or junk folder',
            'Make sure you entered the right email',
            'It can take a minute to arrive',
          ].map((tip) => (
            <p key={tip} className="text-[12px] text-gray-400 flex items-start gap-2">
              <span style={{ color: GREEN }}>•</span> {tip}
            </p>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-[13px]" style={{ color: '#9CA3AF' }}>
          <a href="/restaurant" className="hover:underline hover:text-gray-600 transition-colors">Sign in</a>
          <span>·</span>
          <a href="/" className="hover:underline hover:text-gray-600 transition-colors">Home</a>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantVerifyEmailPage() {
  return (
    <Suspense>
      <RestaurantVerifyEmailContent />
    </Suspense>
  );
}
