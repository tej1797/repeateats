// RepEATLogo — renders "Rep" + "EAT" with portal-aware styling.
// On white/light backgrounds the "Rep" text gets a thin stroke so it's always visible.
// On dark backgrounds (auth pages, feed headers) no stroke is needed.
// planTier adds 3D crown (gold pro / silver starter) + inline plan tag after T.

import { IconCrown } from '@tabler/icons-react';
import { METALLIC_GOLD, METALLIC_SILVER } from '@/lib/customerUI';

type Portal = 'customer' | 'restaurant' | 'influencer' | 'dark'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface RepEATLogoProps {
  portal?:   Portal
  size?:     Size
  planTier?: string
  onClick?:  () => void
  className?: string
}

const FONT_SIZES: Record<Size, number> = { sm: 18, md: 24, lg: 32, xl: 48 }

const STROKE_COLORS: Record<Portal, string> = {
  customer:   '#FF6B00',
  restaurant: '#1249A9',
  influencer: '#7E22CE',
  dark:       'transparent',
}

function planTagForTier(tier?: string): { label: string; color: string; crown: string } | null {
  if (!tier || tier === 'free') return null;
  if (tier === 'pro' || tier === 'yearly') {
    return { label: 'pro', color: '#FF6B00', crown: METALLIC_GOLD.base };
  }
  if (tier === 'starter') {
    return { label: 'starter', color: '#FF6B00', crown: METALLIC_SILVER.base };
  }
  return null;
}

export function RepEATLogo({ portal = 'dark', size = 'md', planTier, onClick, className }: RepEATLogoProps) {
  const fontSize = FONT_SIZES[size]
  const stroke   = STROKE_COLORS[portal]
  const isDark   = portal === 'dark'
  const repColor = isDark ? '#F5F5F4' : '#111'
  const tag      = planTagForTier(planTier)

  return (
    <span
      onClick={onClick}
      className={className}
      style={{
        fontFamily:    'Syne, sans-serif',
        fontWeight:    800,
        fontSize,
        letterSpacing: '-1.5px',
        lineHeight:    1,
        display:       'inline-flex',
        alignItems:    'flex-end',
        cursor:        onClick ? 'pointer' : 'default',
        userSelect:    'none',
        position:      'relative',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {tag && (
          <IconCrown
            size={fontSize * 0.55}
            fill={tag.crown}
            color={tag.crown}
            style={{
              position:  'absolute',
              top:       -fontSize * 0.42,
              left:      1,
              transform: 'rotate(-18deg)',
              filter:    'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            }}
          />
        )}
        <span style={{
          color:            repColor,
          WebkitTextStroke: isDark ? undefined : `1px ${stroke}`,
        }}>
          Rep
        </span>
      </span>
      <span style={{ color: '#FF6B00' }}>EAT</span>
      {tag && (
        <span
          style={{
            fontSize:      fontSize * 0.38,
            fontWeight:    700,
            color:         tag.color,
            marginLeft:    2,
            marginBottom:  1,
            letterSpacing: 0,
            textTransform: 'lowercase',
          }}
        >
          {tag.label}
        </span>
      )}
    </span>
  )
}
