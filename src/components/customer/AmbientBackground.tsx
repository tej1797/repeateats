'use client';

import { CUSTOMER_UI } from '@/lib/customerUI';

export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
      {/* Bottom-up orange glow — mobile parity */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${CUSTOMER_UI.accent}55 0%, ${CUSTOMER_UI.accent}22 18%, ${CUSTOMER_UI.accent}08 35%, transparent 55%, ${CUSTOMER_UI.bg} 100%)`,
        }}
      />
      <div
        className="absolute -top-24 -left-16 w-[380px] h-[380px] rounded-full blur-[110px] opacity-40"
        style={{ background: `radial-gradient(circle, ${CUSTOMER_UI.accent}44 0%, transparent 70%)` }}
      />
    </div>
  );
}
