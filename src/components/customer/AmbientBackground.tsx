'use client';

import { CUSTOMER_UI } from '@/lib/customerUI';

export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
      <div
        className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-[100px]"
        style={{
          background: `radial-gradient(circle, ${CUSTOMER_UI.accent}55 0%, transparent 70%)`,
          animation: 'customerGlow 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[30%] -right-20 w-[360px] h-[360px] rounded-full blur-[90px]"
        style={{
          background: `radial-gradient(circle, ${CUSTOMER_UI.gold}33 0%, transparent 70%)`,
          animation: 'customerGlow 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full blur-[80px]"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
