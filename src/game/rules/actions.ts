import type { Influence } from '../types/card'
import type { ActionType } from '../types/engine'

export interface ActionDefinition {
  type: ActionType
  label: string
  /** Influência que o jogador declara possuir (null = ação geral, não contestável). */
  claim: Influence | null
  /** Moedas pagas ao declarar (não são devolvidas). */
  cost: number
  needsTarget: boolean
  /** Influências que podem bloquear a ação. */
  blockedBy: Influence[]
  /** Quem pode bloquear: qualquer adversário ou apenas o alvo. */
  blockers: 'anyone' | 'target' | 'none'
}

/** Ações da edição base (GDD §3). */
export const ACTIONS: Record<ActionType, ActionDefinition> = {
  income: { type: 'income', label: 'Renda', claim: null, cost: 0, needsTarget: false, blockedBy: [], blockers: 'none' },
  foreign_aid: {
    type: 'foreign_aid',
    label: 'Ajuda Externa',
    claim: null,
    cost: 0,
    needsTarget: false,
    blockedBy: ['duque'],
    blockers: 'anyone',
  },
  coup: { type: 'coup', label: 'Golpe de Estado', claim: null, cost: 7, needsTarget: true, blockedBy: [], blockers: 'none' },
  tax: { type: 'tax', label: 'Taxar', claim: 'duque', cost: 0, needsTarget: false, blockedBy: [], blockers: 'none' },
  assassinate: {
    type: 'assassinate',
    label: 'Assassinar',
    claim: 'assassino',
    cost: 3,
    needsTarget: true,
    blockedBy: ['condessa'],
    blockers: 'target',
  },
  steal: {
    type: 'steal',
    label: 'Roubar',
    claim: 'capitao',
    cost: 0,
    needsTarget: true,
    blockedBy: ['capitao', 'embaixador'],
    blockers: 'target',
  },
  exchange: { type: 'exchange', label: 'Trocar', claim: 'embaixador', cost: 0, needsTarget: false, blockedBy: [], blockers: 'none' },
}

export const ACTION_ORDER: ActionType[] = ['income', 'foreign_aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange']

export const STARTING_COINS = 2
export const MUST_COUP_AT = 10
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
