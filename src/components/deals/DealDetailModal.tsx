'use client';

import Link from 'next/link';
import { IconMapPin, IconX, IconCheck, IconShare2, IconCircleCheck } from '@tabler/icons-react';
import ProgressBar from '@/components/ui/ProgressBar';
import ReviewsSection from '@/components/ReviewsSection';
import type { DealWithRestaurant } from '@/types/index';
import type { User } from '@supabase/supabase-js';

interface DealDetailModalProps {
  deal:            DealWithRestaurant;
  user:            User | null;
  onClose:         () => void;
  onClaim:         () => void;
  claiming?:       boolean;
  claimError?:     string | null;
  alreadyClaimed?: boolean;
  existingQrCode?: string;
  isRedeemed?:     boolean;
  onViewExisting?: (code: string) => void;
  onShare?:        () => void;
}

export default function DealDetailModal({
  deal,
  user,
  onClose,
  onClaim,
  claiming       = false,
  claimError     = null,
  alreadyClaimed = false,
  existingQrCode,
  isRedeemed     = false,
  onViewExisting,
  onShare,
}: DealDetailModalProps) {
  const spotsLeft = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;
  const soldOut   = deal.max_claims !== null && spotsLeft !== null && spotsLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-surface rounded-t-[20px] sm:rounded-brand shadow-brand2 w-full max-w-sm overflow-hidden max-h-[93vh] overflow-y-auto animate-[slideUp_0.22s_ease]">
        {/* Emoji header */}
        <div className="h-36 bg-brandlt flex items-center justify-center relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/25 flex items-center justify-center text-white hover:bg-black/40 transition-colors"
            aria-label="Close"
          >
            <IconX size={14} />
          </button>
          {onShare && (
            <button
              onClick={onShare}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/25 flex items-center justify-center text-white hover:bg-black/40 transition-colors"
              aria-label="Share deal"
            >
              <IconShare2 size={14} />
            </button>
          )}
          <span className="text-6xl">{deal.emoji ?? '🍽️'}</span>
        </div>

        <div className="p-5">
          {/* Deal type badges */}
          {deal.deal_types?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {deal.deal_types.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize bg-blue-50 text-blue-700 border-blue-200"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Restaurant + title */}
          <p className="text-[13px] text-t2 mb-1">{deal.restaurant?.name}</p>
          <h2 className="font-display text-[20px] font-bold mb-3 leading-snug">{deal.title}</h2>

          {/* Discount */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-display text-[34px] font-extrabold text-brand leading-none">
              {deal.discount_value}
            </span>
            {deal.valid_until && (
              <span className="text-[13px] text-t2">Ends {deal.valid_until}</span>
            )}
          </div>

          {/* Description */}
          {deal.description && (
            <p className="text-[14px] text-t2 leading-relaxed mb-4">{deal.description}</p>
          )}

          {/* Progress bar */}
          {deal.max_claims !== null && (
            <div className="bg-surface2 rounded-brands px-3 py-2.5 mb-4">
              <ProgressBar
                value={deal.current_claims}
                max={deal.max_claims}
                showLabel
              />
            </div>
          )}

          {/* Location / days */}
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-2 text-[13px] text-t2">
              <IconMapPin size={15} className="text-brand flex-shrink-0" />
              <span>{deal.restaurant?.address ?? deal.restaurant?.city}</span>
            </div>
            {deal.available_days && deal.available_days[0] !== 'all' && (
              <div className="flex items-center gap-2 text-[13px] text-t2">
                <span className="text-t3 text-[15px]">📅</span>
                <span>{deal.available_days.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Error */}
          {claimError && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2 mb-3">
              {claimError}
            </p>
          )}

          {/* CTA */}
          {deal.is_coming ? (
            <div className="w-full h-12 rounded-brands bg-surface2 border border-[var(--bd2)] flex items-center justify-center text-[15px] font-semibold text-t2">
              Available next week
            </div>
          ) : soldOut ? (
            <div className="w-full h-12 rounded-brands bg-surface2 border border-[var(--bd2)] flex items-center justify-center text-[15px] font-semibold text-t2">
              Fully claimed
            </div>
          ) : !user ? (
            <Link
              href="/customer/login"
              className="w-full h-12 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands flex items-center justify-center transition-colors text-[15px]"
            >
              Sign in to claim this deal
            </Link>
          ) : isRedeemed ? (
            <div className="w-full h-12 rounded-brands bg-green-50 border border-green-200 flex items-center justify-center gap-2 text-[15px] font-semibold text-green-700">
              <IconCircleCheck size={18} /> Redeemed — deal used
            </div>
          ) : alreadyClaimed && existingQrCode ? (
            <button
              onClick={() => onViewExisting?.(existingQrCode)}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-brands transition-colors text-[15px] flex items-center justify-center gap-2"
            >
              <IconCheck size={18} /> Already claimed — View QR Code
            </button>
          ) : (
            <button
              onClick={onClaim}
              disabled={claiming}
              className="w-full h-12 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-semibold rounded-brands transition-colors text-[15px]"
            >
              {claiming ? 'Claiming…' : 'Claim Deal'}
            </button>
          )}

          {/* Reviews */}
          {deal.restaurant?.id && (
            <ReviewsSection restaurantId={deal.restaurant.id} />
          )}
        </div>
      </div>
    </div>
  );
}
