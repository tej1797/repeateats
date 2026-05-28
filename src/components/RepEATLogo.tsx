// RepEATLogo — renders "Rep" + "EAT" with portal-aware styling.
// On white/light backgrounds the "Rep" text gets a thin stroke so it's always visible.
// On dark backgrounds (auth pages, feed headers) no stroke is needed.

type Portal = 'customer' | 'restaurant' | 'influencer' | 'dark'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface RepEATLogoProps {
  portal?: Portal
  size?: Size
  onClick?: () => void
  className?: string
}

const FONT_SIZES: Record<Size, number> = { sm: 18, md: 24, lg: 32, xl: 48 }

// Stroke colors match each portal's accent color so "Rep" is legible on white cards
const STROKE_COLORS: Record<Portal, string> = {
  customer:   '#E85D04',
  restaurant: '#065F46',
  influencer: '#7E22CE',
  dark:       'transparent',
}

export function RepEATLogo({ portal = 'dark', size = 'md', onClick, className }: RepEATLogoProps) {
  const fontSize   = FONT_SIZES[size]
  const stroke     = STROKE_COLORS[portal]
  const isDark     = portal === 'dark'
  const repColor   = isDark ? '#fff' : '#111'

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
        display:       'inline-block',
        cursor:        onClick ? 'pointer' : 'default',
        userSelect:    'none',
      }}
    >
      <span style={{
        color:              repColor,
        // thin outline so "Rep" is visible on white/light backgrounds
        WebkitTextStroke:   isDark ? undefined : `1px ${stroke}`,
      }}>
        Rep
      </span>
      <span style={{ color: '#E85D04' }}>EAT</span>
    </span>
  )
}
