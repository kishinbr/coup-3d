import type { Influence } from './card'

/**
 * Dados PÚBLICOS de um jogador (GDD §11.3).
 * Note que não existe campo para cartas ocultas: o cliente nunca as recebe.
 */
export interface PublicPlayer {
  id: string
  name: string
  coins: number
  /** Quantidade de influências ainda ocultas (0, 1 ou 2). */
  hiddenInfluenceCount: number
  /** Influências já reveladas (perdidas), visíveis a todos. */
  revealed: Influence[]
  /** Posição na mesa (0 a 5). O assento 0 é sempre o do jogador local. */
  seat: number
  eliminated: boolean
}

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
