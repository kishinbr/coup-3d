/** Aparência do avatar provisório (Fase 1). */
export type HairStyle = 'slick' | 'bun' | 'swept'

export interface AvatarLook {
  skin: string
  hair: string
  hairStyle: HairStyle
  outfit: string
  outfitAccent: string
  shirt: string
  beard?: boolean
  dress?: boolean
}
