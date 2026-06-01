'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RepeatPlusSuccess() {
  const router = useRouter();
  const [secs, setSecs] = useState(5);

  useEffect(() => {
    // CSS confetti via keyframes — no extra package needed
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confettiFall {
        0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
      .confetti-piece {
        position: fixed;
        width: 10px;
        height: 10px;
        animation: confettiFall linear forwards;
        border-radius: 2px;
        z-index: 9999;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    const colors = ['#E85D04', '#F59E0B', '#FFD700', '#fff', '#065F46'];
    const pieces: HTMLElement[] = [];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left    = `${Math.random() * 100}vw`;
      el.style.top     = '-20px';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      el.style.animationDelay   = `${Math.random() * 1.5}s`;
      document.body.appendChild(el);
      pieces.push(el);
    }

    // Countdown + redirect
    const countDown = setInterval(() => setSecs(s => s - 1), 1000);
    const redirect  = setTimeout(() => router.push('/customer/profile'), 5000);
    const cleanup   = setTimeout(() => pieces.forEach(el => el.remove()), 5000);

    return () => {
      clearInterval(countDown);
      clearTimeout(redirect);
      clearTimeout(cleanup);
      pieces.forEach(el => el.remove());
      style.remove();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: '#0A0A0A' }}>
      <div>
        <div className="text-7xl mb-6 animate-bounce">👑</div>

        <h1 className="font-display text-[42px] font-extrabold text-white mb-3 leading-tight">
          Welcome to Rep<span style={{ color: '#F59E0B' }}>EAT+</span>
        </h1>

        <p className="text-[18px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Your 7-day free trial has started!
        </p>
        <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Exclusive deals, early access, and real savings — all yours now.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/customer"
            className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-bold text-[15px] transition-all hover:opacity-90"
            style={{ background: '#F59E0B', color: '#0A0A0A' }}
          >
            Browse exclusive deals →
          </Link>
          <Link
            href="/customer/profile"
            className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-semibold text-[15px] border transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            Go to my profile
          </Link>
        </div>

        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Redirecting to your profile in {secs}s…
        </p>
      </div>
    </div>
  );
}
