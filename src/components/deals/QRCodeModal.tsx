'use client';

import { QRCode } from 'react-qrcode-logo';
import { IconDownload, IconX } from '@tabler/icons-react';
import { IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';

const QR_CANVAS_ID = 'repeateats-qr-canvas';

interface QRCodeModalProps {
  code:           string;
  dealTitle:      string;
  restaurantName?: string;
  onClose:        () => void;
}

export default function QRCodeModal({ code, dealTitle, restaurantName, onClose }: QRCodeModalProps) {
  const handleDownload = () => {
    const canvas = document.getElementById(QR_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link   = document.createElement('a');
    link.download = `repeateats-${code}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-surface rounded-t-[20px] sm:rounded-brand shadow-brand2 w-full max-w-[310px] p-6 text-center animate-[slideUp_0.22s_ease]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors"
          aria-label="Close"
        >
          <IconX size={14} />
        </button>

        {/* Success icon */}
        <div className="w-14 h-14 bg-brandlt rounded-full flex items-center justify-center mx-auto mb-3">
          <IconCircleCheck size={28} className="text-brand" />
        </div>
        <h2 className="font-display text-[20px] font-bold mb-0.5">Deal Claimed!</h2>
        {restaurantName && (
          <p className="text-[12px] text-t3 mb-0.5">{restaurantName}</p>
        )}
        <p className="text-[13px] text-t2 mb-4 px-2 line-clamp-2">{dealTitle}</p>

        {/* Scannable QR */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-[12px] border border-gray-100 shadow-sm inline-block">
            <QRCode
              id={QR_CANVAS_ID}
              value={`https://repeateats.ca/redeem/${code}`}
              size={180}
              bgColor="#ffffff"
              fgColor="#E85D04"
              qrStyle="dots"
              eyeRadius={8}
            />
          </div>
        </div>

        {/* Code text */}
        <p className="font-display text-[28px] font-extrabold tracking-[0.15em] text-brand mb-0.5">
          {code}
        </p>
        <p className="text-[12px] text-t3 mb-4">Show this to restaurant staff at checkout</p>

        {/* Info */}
        <div className="bg-brandlt rounded-brands px-3 py-2 text-[12px] text-t2 leading-relaxed mb-4 flex items-start gap-1.5">
          <IconInfoCircle size={13} className="text-brand flex-shrink-0 mt-0.5" />
          <span>Valid for one visit · Single use code</span>
        </div>

        {/* Actions */}
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
