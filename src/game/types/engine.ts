import type { Influence } from './card'

/* =====================================================================
 * Tipos do motor de regras.
 * O GameState é a verdade completa e só existe no "servidor"
 * (na Fase 3, o controlador local; na Fase 4, o Durable Object).
 * Os clientes recebem apenas PlayerView (ver rules/view.ts).
 * ===================================================================== */

export type ActionType = 'income' | 'foreign_aid' | 'coup' | 'tax' | 'assassinate' | 'steal' | 'exchange'

export interface InfluenceCard {
  id: string
  influence: Influence
  revealed: boolean
}

export interface PlayerState {
  id: string
  name: string
  coins: number
  cards: InfluenceCard[]
  eliminated: boolean
}

export interface DeclaredAction {
  type: ActionType
  actorId: string
  targetId?: string
}

export interface DeclaredBlock {
  blockerId: string
  claim: Influence
}

/** O que acontece depois que uma perda de influência é resolvida. */
export type Continuation = 'open_block_window' | 'resolve_action' | 'end_turn'

export type LossReason = 'coup' | 'assassinated' | 'lost_challenge' | 'caught_bluffing'

export type Phase =
  | { kind: 'awaiting_action' }
  /** Todos (menos quem agiu) podem contestar a influência declarada. */
  | { kind: 'action_challenge_window'; action: DeclaredAction; responded: string[] }
  /** Quem pode bloquear decide se bloqueia. */
  | { kind: 'block_window'; action: DeclaredAction; responded: string[] }
  /** Todos (menos quem bloqueou) podem contestar o bloqueio. */
  | { kind: 'block_challenge_window'; action: DeclaredAction; block: DeclaredBlock; responded: string[] }
  | { kind: 'choosing_influence_loss'; playerId: string; reason: LossReason; action: DeclaredAction | null; next: Continuation }
  | { kind: 'choosing_exchange'; action: DeclaredAction; drawn: InfluenceCard[] }
  | { kind: 'game_over'; winnerId: string }

export interface GameState {
  players: PlayerState[]
  /** A Corte: baralho central, virado para baixo. */
  court: InfluenceCard[]
  currentPlayerIndex: number
  phase: Phase
  turn: number
  /** Estado do gerador aleatório (partidas reproduzíveis nos testes). */
  rng: number
}

/* ----------------------------- Comandos ----------------------------- */

export type Command =
  | { type: 'declare_action'; action: ActionType; targetId?: string }
  | { type: 'challenge' }
  | { type: 'block'; claim: Influence }
  | { type: 'pass' }
  | { type: 'choose_influence'; cardId: string }
  | { type: 'exchange_keep'; cardIds: string[] }

/* ------------------------------ Eventos ----------------------------- */

/**
 * Eventos emitidos a cada comando aceito (GDD §11.4). Servem para o registro
 * e, na fase visual, para disparar animações. Eventos com `to` são privados.
 */
export type GameEvent =
  | { type: 'GAME_STARTED'; playerIds: string[] }
  | { type: 'TURN_STARTED'; playerId: string; turn: number; mustCoup: boolean }
  | { type: 'ACTION_DECLARED'; action: DeclaredAction; claim: Influence | null }
  | { type: 'COINS_CHANGED'; playerId: string; delta: number; reason: ActionType }
  | { type: 'COINS_TRANSFERRED'; fromId: string; toId: string; amount: number }
  | { type: 'CHALLENGE_DECLARED'; challengerId: string; claimantId: string; claim: Influence }
  | { type: 'CHALLENGE_RESOLVED'; challengerId: string; claimantId: string; claim: Influence; claimWasTrue: boolean }
  | { type: 'CARD_REPLACED'; playerId: string }
  | { type: 'CARD_DRAWN_PRIVATE'; to: string; influence: Influence }
  | { type: 'BLOCK_DECLARED'; block: DeclaredBlock; action: DeclaredAction }
  | { type: 'PASSED'; playerId: string }
  | { type: 'INFLUENCE_LOST'; playerId: string; influence: Influence; reason: LossReason }
  | { type: 'PLAYER_ELIMINATED'; playerId: string }
  | { type: 'ACTION_BLOCKED'; action: DeclaredAction; block: DeclaredBlock }
  | { type: 'ACTION_CANCELLED'; action: DeclaredAction }
  | { type: 'ACTION_RESOLVED'; action: DeclaredAction }
  | { type: 'EXCHANGE_COMPLETED'; playerId: string }
  | { type: 'GAME_FINISHED'; winnerId: string }

export type CommandResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string }

/* ------------------------- Visão por jogador ------------------------ */

export interface PublicPlayerView {
  id: string
  name: string
  coins: number
  hiddenInfluenceCount: number
  revealed: Influence[]
  eliminated: boolean
}

export interface ActionOption {
  type: ActionType
  enabled: boolean
  /** Motivo de estar indisponível (ex.: "Requer 7 moedas"). */
  reason?: string
  needsTarget: boolean
}

/** O que ESTE jogador pode fazer agora. Nunca inclui opções impossíveis (GDD §9.3). */
export type Prompt =
  | { kind: 'choose_action'; actions: ActionOption[]; targets: string[]; mustCoup: boolean }
  | { kind: 'respond_action'; action: DeclaredAction; claim: Influence; canChallenge: true }
  | { kind: 'respond_block_window'; action: DeclaredAction; blockClaims: Influence[] }
  | { kind: 'respond_block'; action: DeclaredAction; block: DeclaredBlock }
  | { kind: 'lose_influence'; reason: LossReason; cards: InfluenceCard[] }
  | { kind: 'exchange'; cards: InfluenceCard[]; keep: number }

/** Descrição pública do momento da partida. */
export interface PhaseView {
  kind: Phase['kind']
  action?: DeclaredAction
  block?: DeclaredBlock
  /** Quem a partida está esperando. */
  waitingOn: string[]
  lossPlayerId?: string
  winnerId?: string
}

export interface PlayerView {
  viewerId: string
  players: PublicPlayerView[]
  currentPlayerId: string
  courtCount: number
  turn: number
  /** Só as cartas do próprio jogador (informação privada). */
  myCards: InfluenceCard[]
  phase: PhaseView
  prompt: Prompt | null
}
