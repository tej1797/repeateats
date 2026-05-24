'use client';

// Standalone sign-in page for customers.
// Redirects back to /customer after successful login.

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

export default function CustomerLoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const supabase = useRef(createClient()).current;
  const router   = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error: authError } = await fn;
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    router.push('/customer');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/customer` },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] text-t2 hover:text-brand mb-6 transition-colors">
          <IconArrowLeft size={16} /> Back to home
        </Link>

        <div className="bg-surface rounded-brand shadow-brand p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-brands bg-brandlt flex items-center justify-center text-2xl">🍽️</div>
            <div>
              <div className="font-display text-[22px] font-extrabold tracking-tight leading-none">
                Rep<span className="text-brand">EAT</span>
              </div>
              <p className="text-[12px] text-t2">Customer Portal · Ontario</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" required
                className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
            </div>
            {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full h-11 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors">
              {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-[var(--bd)]" />
            <span className="text-[12px] text-t3">or</span>
            <div className="flex-1 h-px bg-[var(--bd)]" />
          </div>

          <button onClick={handleGoogle}
            className="w-full h-11 border border-[var(--bd2)] rounded-brands font-semibold text-[14px] text-tx hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2">
            <span className="text-[16px]">G</span> Continue with Google
          </button>

          <p className="text-center text-[13px] text-t2 mt-4">
            {isSignUp ? 'Already have an account?' : 'No account?'}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-brand font-semibold">
              {isSignUp ? 'Sign in →' : 'Create one free →'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
