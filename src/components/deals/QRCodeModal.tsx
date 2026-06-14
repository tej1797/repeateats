'use client';

import { useState } from 'react';
import { IconX, IconCircleCheck } from '@tabler/icons-react';
import { VanishingQR } from './VanishingQR';

interface QRCodeModalProps {
  claimId:         string;
  dealTitle:       string;
  restaurantName?: string;
  onClose:         () => void;
  onRedeemed?:     (redeemedAt: string | null) => void;
}

export default function QRCodeModal({ claimId, dealTitle, restaurantName, onClose, onRedeemed }: QRCodeModalProps) {
  const [redeemed, setRedeemed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-t-[20px] sm:rounded-brand shadow-brand2 w-full max-w-[340px] pt-6 pb-5 text-center animate-[slideUp_0.22s_ease]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors"
          aria-label="Close"
        >
          <IconX size={14} />
        </button>

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
          style={{ background: redeemed ? 'rgba(34,197,94,0.15)' : undefined }}
        >
          <IconCircleCheck size={24} className={redeemed ? 'text-[#4ade80]' : 'text-brand'} />
        </div>
        <h2 className="font-display text-[19px] font-bold mb-0.5">
          {redeemed ? 'Deal Redeemed' : 'Deal Claimed!'}
        </h2>
        {restaurantName && <p className="text-[12px] text-t3 mb-0.5">{restaurantName}</p>}
        <p className="text-[13px] text-t2 mb-5 px-4 line-clamp-2">{dealTitle}</p>

        <VanishingQR
          claimId={claimId}
          onRedeemed={(at) => { setRedeemed(true); onRedeemed?.(at); }}
        />

        <div className="px-5 mt-5">
          <button
            onClick={onClose}
            className="w-full h-11 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands transition-colors text-[14px]"
          >
            {redeemed ? 'Close' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
