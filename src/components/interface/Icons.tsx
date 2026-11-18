import type { SVGProps } from 'react'

/** Ícones de traço próprios, no mesmo estilo (1.6px, cantos arredondados). */
type P = SVGProps<SVGSVGElement>
const base = (props: P) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
export const IconCoin = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="7" rx="7" ry="3" />
    <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
    <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
  </svg>
)
export const IconPlusCoin = (p: P) => (
  <svg {...base(p)}>
    <circle cx="10" cy="12" r="6.5" />
    <path d="M10 9v6M7 12h6" />
    <path d="M18.5 6.5c1.6 1.4 2.5 3.4 2.5 5.5s-.9 4.1-2.5 5.5" />
  </svg>
)
export const IconHands = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 13l4-4 3 1 2-2 3 1 3-2 3 3" />
    <path d="M7 9l5 5c.6.6 1.6.6 2.1 0 .6-.6.6-1.5 0-2.1" />
    <path d="M10 12l3.5 3.5c.6.6 1.6.6 2.1 0 .6-.6.6-1.5 0-2.1L13 11" />
    <path d="M3 13l5 5c.6.6 1.5.6 2.1 0" />
  </svg>
)
export const IconCrown = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 18h18M4 15l-1-8 5 4 4-6 4 6 5-4-1 8H4Z" />
  </svg>
)
export const IconDagger = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.5 3.5 20.5 3.5 20.5 9.5 10 20l-2-2 4-4-1.5-1.5L6.5 16.5" />
    <path d="M4 14l6 6M3 21l3-3" />
  </svg>
)
export const IconAnchor = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v14M8 10h8M4 13a8 8 0 0 0 16 0" />
  </svg>
)
export const IconSwap = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
)
export const IconFist = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v3M5 5l2 2M19 5l-2 2" />
    <rect x="6" y="10" width="12" height="9" rx="3" />
    <path d="M9 10v3M12 10v3M15 10v3M8 22h8" />
  </svg>
)
export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5v.5" />
  </svg>
)
export const IconInfo = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 10h8M8 14h8M8 18h5" />
  </svg>
)
