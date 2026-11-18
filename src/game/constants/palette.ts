/** Paleta oficial do Coup 3D (GDD §6.2). Use sempre estas constantes. */
export const PALETTE = {
  background: '#171311',
  wood: '#39271E',
  felt: '#542326',
  gold: '#C59B53',
  ivory: '#EEE5D5',
  beige: '#B7A58B',
  highlight: '#E2BC76',
} as const

/** Cores auxiliares derivadas da paleta, usadas em materiais 3D. */
export const MATERIAL_COLORS = {
  woodDark: '#24170f',
  woodPolished: '#3d2619',
  feltDeep: '#3d171a',
  velvet: '#4a1519',
  wall: '#1e1613',
  skinLight: '#e7b796',
  skinMedium: '#c98f6b',
  skinTan: '#d9a07a',
} as const
