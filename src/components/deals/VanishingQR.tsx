'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconCircleCheck } from '@tabler/icons-react';
import { QRCode } from 'react-qrcode-logo';
import { formatRedeemedAt } from '@/lib/utils';

interface VanishingQRProps {
  claimId: string;
  onRedeemed?: (redeemedAt: string | null) => void;
}

type QRState = 'hidden' | 'visible' | 'exhausted' | 'redeemed';

interface ClaimStateResponse {
  reveals_used?:     number;
  last_revealed_at?: string | null;
  qr_token_current?: string | null;
  status?:           string;
  redeemed_at?:      string | null;
}

export function VanishingQR({ claimId, onRedeemed }: VanishingQRProps) {
  const [state,            setState]            = useState<QRState>('hidden');
  const [qrToken,          setQrToken]          = useState<string | null>(null);
  const [revealsRemaining, setRevealsRemaining] = useState<number | null>(null);
  const [secondsLeft,      setSecondsLeft]      = useState(0);
  const [redeemedAt,       setRedeemedAt]       = useState<string | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [initialising,     setInitialising]     = useState(true);

  const timerRef     = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const pollRef      = useRef<ReturnType<typeof setInterval>>();

  const stopTimers = useCallback(() => {
    clearInterval(countdownRef.current);
    clearTimeout(timerRef.current);
    setSecondsLeft(0);
  }, []);

  const hideQR = useCallback(() => {
    setState(s => (s === 'redeemed' ? 'redeemed' : 'hidden'));
    stopTimers();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopTimers]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) hideQR();
  }, [hideQR]);

  const applyRedeemed = useCallback((at: string | null) => {
    stopTimers();
    clearInterval(pollRef.current);
    setRedeemedAt(at);
    setState('redeemed');
    onRedeemed?.(at);
  }, [onRedeemed, stopTimers]);

  const applyClaimState = useCallback((data: ClaimStateResponse) => {
    if (data.status === 'redeemed') {
      applyRedeemed(data.redeemed_at ?? null);
      return true;
    }
    return false;
  }, [applyRedeemed]);

  useEffect(() => {
    const fetchClaimState = async () => {
      try {
        const res  = await fetch(`/api/claims/state?claim_id=${claimId}`);
        const data = await res.json() as ClaimStateResponse;

        if (!res.ok) {
          setRevealsRemaining(0);
          setState('exhausted');
          return;
        }

        if (applyClaimState(data)) return;

        const remaining = Math.max(0, 2 - (data.reveals_used ?? 0));
        setRevealsRemaining(remaining);

        if (remaining === 0) {
          setState('exhausted');
          return;
        }

        const lastReveal   = data.last_revealed_at ? new Date(data.last_revealed_at).getTime() : null;
        const visibleUntil = lastReveal ? lastReveal + 2 * 60 * 1000 : null;

        if (visibleUntil && visibleUntil > Date.now()) {
          setQrToken(data.qr_token_current ?? null);
          setState('visible');

          const msLeft = visibleUntil - Date.now();
          setSecondsLeft(Math.ceil(msLeft / 1000));

          stopTimers();

          timerRef.current = setTimeout(hideQR, msLeft);
          countdownRef.current = setInterval(() => {
            setSecondsLeft(s => {
              if (s <= 1) { clearInterval(countdownRef.current); return 0; }
              return s - 1;
            });
          }, 1000);
        }
      } catch {
        setRevealsRemaining(0);
      } finally {
        setInitialising(false);
      }
    };

    void fetchClaimState();
  }, [claimId, hideQR, applyClaimState, stopTimers]);

  // Poll while open so restaurant scan stops the timer immediately
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/claims/state?claim_id=${claimId}`);
        const data = await res.json() as ClaimStateResponse;
        if (res.ok) applyClaimState(data);
      } catch { /* ignore */ }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [claimId, applyClaimState]);

  useEffect(() => {
    if (state !== 'visible') return;
    const handleBlur = () => hideQR();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [state, hideQR]);

  useEffect(() => () => {
    stopTimers();
    clearInterval(pollRef.current);
  }, [stopTimers]);

  const revealQR = async () => {
    if (loading || state === 'exhausted' || state === 'redeemed' || initialising) return;
    setLoading(true);

    try {
      const res  = await fetch('/api/claims/reveal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ claim_id: claimId }),
      });
      const data = await res.json() as {
        qr_token?:          string;
        reveals_remaining?: number;
        visible_until?:     string;
      };

      if (res.status === 403) { setState('exhausted'); setRevealsRemaining(0); return; }
      if (!res.ok) return;

      setQrToken(data.qr_token ?? null);
      setRevealsRemaining(data.reveals_remaining ?? 0);
      setState('visible');

      const msLeft = Math.max(0, new Date(data.visible_until!).getTime() - Date.now());
      setSecondsLeft(Math.ceil(msLeft / 1000));

      stopTimers();

      timerRef.current = setTimeout(hideQR, msLeft);
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { clearInterval(countdownRef.current); return 0; }
          return s - 1;
        });
      }, 1000);

      document.addEventListener('visibilitychange', handleVisibilityChange);
    } finally {
      setLoading(false);
    }
  };

  if (state === 'redeemed') {
    return (
      <div style={{ textAlign: 'center', padding: '0 16px' }}>
        <div
          className="rounded-2xl px-4 py-4 mb-4 text-left"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)' }}
        >
          <div className="flex items-start gap-3">
            <IconCircleCheck size={22} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-[15px] font-bold" style={{ color: '#4ade80' }}>Deal redeemed</p>
              {redeemedAt && (
                <p className="text-[13px] mt-0.5" style={{ color: '#888' }}>
                  Redeemed {formatRedeemedAt(redeemedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="w-full py-3.5 rounded-2xl text-[15px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#666', cursor: 'default' }}
        >
          Already redeemed
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <div
        onClick={(!initialising && state !== 'exhausted') ? revealQR : undefined}
        style={{
          display:          'inline-block',
          margin:           '0 auto 4px',
          borderRadius:     16,
          background:       '#fff',
          padding:          16,
          cursor:           (initialising || state === 'exhausted') ? 'default' : 'pointer',
          userSelect:       'none',
          WebkitUserSelect: 'none',
          boxShadow:        '0 2px 12px rgba(0,0,0,0.10)',
        }}
      >
        {state === 'visible' && qrToken ? (
          <>
            <QRCode
              value={qrToken}
              size={180}
              quietZone={8}
              fgColor="#FF7A00"
              bgColor="#FFFFFF"
              ecLevel="M"
              qrStyle="dots"
              eyeRadius={8}
              style={{ display: 'block', margin: '0 auto' }}
            />
            <div style={{
              marginTop:        12,
              fontFamily:       'monospace',
              fontSize:         15,
              fontWeight:       700,
              color:            '#FF7A00',
              letterSpacing:    '0.15em',
              textAlign:        'center',
              userSelect:       'none',
              WebkitUserSelect: 'none',
            }}>
              {qrToken}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, textAlign: 'center' }}>
              Enter manually if scan fails
            </div>
          </>
        ) : (
          <div style={{
            width:          180,
            height:         180,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            background:     state === 'exhausted' ? '#f5f5f5' : '#fff',
            borderRadius:   8,
            gap:            8,
          }}>
            {initialising ? (
              <span style={{ fontSize: 13, color: '#aaa' }}>Loading…</span>
            ) : state === 'exhausted' ? (
              <>
                <span style={{ fontSize: 32 }}>🚫</span>
                <span style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '0 16px' }}>
                  No reveals remaining. Contact support if needed.
                </span>
              </>
            ) : (
              <>
                <div style={{
                  width:          64,
                  height:         64,
                  borderRadius:   '50%',
                  background:     'rgba(255,122,0,0.10)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: loading ? 20 : 28 }}>
                    {loading ? '⏳' : '👁'}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                  {loading ? 'Loading…' : 'Tap to reveal'}
                </span>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {revealsRemaining === null
                    ? '…'
                    : `${revealsRemaining} reveal${revealsRemaining !== 1 ? 's' : ''} remaining`
                  }
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {state === 'visible' && (
        <div style={{
          background:   'rgba(255,122,0,0.10)',
          border:       '1px solid rgba(255,122,0,0.30)',
          borderRadius: 8,
          padding:      '6px 14px',
          marginTop:    10,
          marginBottom: 8,
          fontSize:     13,
          color:        '#FF7A00',
          fontWeight:   500,
          textAlign:    'center',
        }}>
          Visible for {secondsLeft}s · {revealsRemaining} reveal{revealsRemaining !== 1 ? 's' : ''} left
        </div>
      )}

      <div style={{ fontSize: 12, color: '#999', marginTop: state === 'visible' ? 0 : 10 }}>
        Show to restaurant staff at checkout
      </div>
      <div style={{
        fontSize:     11,
        color:        '#aaa',
        marginTop:    6,
        padding:      '5px 12px',
        background:   'rgba(0,0,0,0.03)',
        borderRadius: 8,
        display:      'inline-block',
      }}>
        Single use · Expires in 1 hour · Identity watermarked
      </div>
    </div>
  );
}
