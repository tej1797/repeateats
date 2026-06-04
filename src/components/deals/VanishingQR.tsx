'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface VanishingQRProps {
  claimId: string;
}

type QRState = 'hidden' | 'visible' | 'exhausted';

export function VanishingQR({ claimId }: VanishingQRProps) {
  const [state,            setState]            = useState<QRState>('hidden');
  const [qrToken,          setQrToken]          = useState<string | null>(null);
  const [revealsRemaining, setRevealsRemaining] = useState(2);
  const [secondsLeft,      setSecondsLeft]      = useState(0);
  const [loading,          setLoading]          = useState(false);

  const timerRef     = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const hideQR = useCallback(() => {
    setState('hidden');
    setSecondsLeft(0);
    clearInterval(countdownRef.current);
    clearTimeout(timerRef.current);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) hideQR();
  }, [hideQR]);

  useEffect(() => {
    if (state !== 'visible') return;
    const handleBlur = () => hideQR();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [state, hideQR]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const revealQR = async () => {
    if (loading || state === 'exhausted') return;
    setLoading(true);

    try {
      const res  = await fetch('/api/claims/reveal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ claim_id: claimId }),
      });
      const data = await res.json() as {
        qr_token?: string;
        reveals_remaining?: number;
        visible_until?: string;
        error?: string;
      };

      if (res.status === 403) { setState('exhausted'); return; }
      if (!res.ok)             return;

      setQrToken(data.qr_token ?? null);
      setRevealsRemaining(data.reveals_remaining ?? 0);
      setState('visible');

      const msLeft = Math.max(0, new Date(data.visible_until!).getTime() - Date.now());
      setSecondsLeft(Math.ceil(msLeft / 1000));

      clearTimeout(timerRef.current);
      clearInterval(countdownRef.current);

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

  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>

      {/* QR tap area — height auto so token text doesn't overflow */}
      <div
        onClick={state !== 'exhausted' ? revealQR : undefined}
        style={{
          display:          'inline-block',
          margin:           '0 auto 4px',
          borderRadius:     16,
          background:       '#fff',
          padding:          16,
          cursor:           state === 'exhausted' ? 'default' : 'pointer',
          userSelect:       'none',
          WebkitUserSelect: 'none',
          boxShadow:        '0 2px 12px rgba(0,0,0,0.10)',
        }}
      >
        {state === 'visible' && qrToken ? (
          <>
            <QRCodeSVG
              value={qrToken}
              size={180}
              level="L"
              fgColor="#FF7A00"
              bgColor="#ffffff"
              style={{ display: 'block' }}
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
            {state === 'exhausted' ? (
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
                  {revealsRemaining} reveal{revealsRemaining !== 1 ? 's' : ''} remaining
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Timer pill — outside the white box */}
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
