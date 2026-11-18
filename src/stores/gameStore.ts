import { create } from 'zustand'
import type { TableView } from '../game/types/game'
import type { AvatarLook } from '../game/types/player'
import { MATERIAL_COLORS } from '../game/constants/palette'

/**
 * FASE 1 — dados ILUSTRATIVOS.
 * Não há regras nem servidor ainda. Esta store só alimenta a cena com um
 * estado de mesa plausível. Na Fase 3/4 ela passará a receber eventos reais.
 */
const ILLUSTRATIVE_TABLE: TableView = {
  localPlayerId: 'voce',
  currentTurnPlayerId: 'marina',
  // 25 cartas − 4 jogadores × 2 = 17 na Corte
  courtCount: 17,
  myInfluences: ['duque', 'capitao'],
  players: [
    { id: 'voce', name: 'Você', coins: 2, hiddenInfluenceCount: 2, revealed: [], seat: 0, eliminated: false },
    { id: 'rafael', name: 'Rafael', coins: 2, hiddenInfluenceCount: 2, revealed: [], seat: 2, eliminated: false },
    { id: 'marina', name: 'Marina', coins: 2, hiddenInfluenceCount: 2, revealed: [], seat: 3, eliminated: false },
    { id: 'lucas', name: 'Lucas', coins: 2, hiddenInfluenceCount: 2, revealed: [], seat: 4, eliminated: false },
  ],
  log: [
    { id: 'l1', kind: 'info', text: 'Mesa ilustrativa montada' },
    { id: 'l2', kind: 'action', text: 'Regras entram na Fase 3' },
    { id: 'l3', kind: 'coins', text: 'Cada jogador começa com 2 moedas' },
  ],
}

export const AVATAR_LOOKS: Record<string, AvatarLook> = {
  lucas: {
    skin: MATERIAL_COLORS.skinTan,
    hair: '#1b1210',
    hairStyle: 'slick',
    outfit: '#2b201b',
    outfitAccent: '#C59B53',
    shirt: '#e9e0d0',
  },
  marina: {
    skin: MATERIAL_COLORS.skinLight,
    hair: '#6e2a17',
    hairStyle: 'bun',
    outfit: '#8e1c26',
    outfitAccent: '#E2BC76',
    shirt: '#8e1c26',
    dress: true,
  },
  rafael: {
    skin: MATERIAL_COLORS.skinMedium,
    hair: '#c9c2b8',
    hairStyle: 'swept',
    outfit: '#25345a',
    outfitAccent: '#C59B53',
    shirt: '#2b2f3a',
    beard: true,
  },
}

interface GameStore {
  table: TableView
}

export const useGameStore = create<GameStore>(() => ({
  table: ILLUSTRATIVE_TABLE,
}))
