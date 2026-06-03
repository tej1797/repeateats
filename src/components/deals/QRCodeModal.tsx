'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IconDownload, IconX, IconCircleCheck, IconInfoCircle, IconRefresh } from '@tabler/icons-react';

interface QRCodeModalProps {
  code:           string;  // raw qr_code string from DB (e.g. "RE-4A7X2B")
  dealTitle:      string;
  restaurantName?: string;
  claimId?:       string;  // if provided, uses dynamic rotating token
  onClose:        () => void;
}

export default function QRCodeModal({ code, dealTitle, restaurantName, claimId, onClose }: QRCodeModalProps) {
  const [displayCode, setDisplayCode] = useState(code);
  const [secsLeft,    setSecsLeft]    = useState<number | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Fetch and refresh dynamic token every 55s (token valid ~60s)
  useEffect(() => {
    if (!claimId) return;

    const fetchToken = async () => {
      try {
        const res  = await fetch(`/api/claims/token/${claimId}`);
        if (!res.ok) return;
        const data = await res.json() as { code?: string; seconds_left?: number };
        if (data.code) setDisplayCode(data.code);
        if (data.seconds_left !== undefined) setSecsLeft(data.seconds_left);
      } catch { /* keep showing current code */ }
    };

    void fetchToken();
    const interval = setInterval(() => { void fetchToken(); }, 55_000);
    const tick     = setInterval(() => {
      setSecsLeft(s => (s !== null && s > 0) ? s - 1 : s);
    }, 1000);

    return () => { clearInterval(interval); clearInterval(tick); };
  }, [claimId]);

  // Convert the rendered SVG to a PNG and trigger download
  const handleDownload = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;

    const xml  = new XMLSerializer().serializeToString(svgEl);
    const size = 232; // canvas size for high-res download
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.download = `repeateats-${displayCode}.png`;
      a.href     = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-t-[20px] sm:rounded-brand shadow-brand2 w-full max-w-[310px] p-6 text-center animate-[slideUp_0.22s_ease]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors"
          aria-label="Close"
        >
          <IconX size={14} />
        </button>

        <div className="w-14 h-14 bg-brandlt rounded-full flex items-center justify-center mx-auto mb-3">
          <IconCircleCheck size={28} className="text-brand" />
        </div>
        <h2 className="font-display text-[20px] font-bold mb-0.5">Deal Claimed!</h2>
        {restaurantName && <p className="text-[12px] text-t3 mb-0.5">{restaurantName}</p>}
        <p className="text-[13px] text-t2 mb-4 px-2 line-clamp-2">{dealTitle}</p>

        {/* QR code — standard matrix format, scannable by any QR reader */}
        <div className="flex justify-center mb-1" ref={svgContainerRef}>
          <div className="inline-block" style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
            <QRCodeSVG
              value={displayCode}
              size={180}
              level="L"
              fgColor="#FF7A00"
              bgColor="#ffffff"
            />
          </div>
        </div>

        {/* Dynamic QR countdown */}
        {claimId && secsLeft !== null && (
          <div className="flex items-center justify-center gap-1 text-[11px] text-t3 mb-2">
            <IconRefresh size={11} />
            <span>QR refreshes in {secsLeft}s</span>
          </div>
        )}

        <p className="font-display text-[20px] font-extrabold tracking-[0.12em] text-brand mb-0.5">
          {displayCode}
        </p>
        <p className="text-[12px] text-t3 mb-4">Show this to restaurant staff at checkout</p>

        <div className="bg-brandlt rounded-brands px-3 py-2 text-[12px] text-t2 leading-relaxed mb-4 flex items-start gap-1.5">
          <IconInfoCircle size={13} className="text-brand flex-shrink-0 mt-0.5" />
          <span>{claimId ? 'Dynamic QR — rotates every 60s to prevent sharing' : 'Valid for one visit · Single use code'}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 h-10 border border-[var(--bd2)] rounded-brands text-[13px] font-semibold text-t2 hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-1.5"
          >
            <IconDownload size={14} /> Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-10 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors text-[13px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
