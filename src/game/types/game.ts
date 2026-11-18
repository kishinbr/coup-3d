import type { Influence } from './card'
import type { PublicPlayer } from './player'

export interface LogEntry {
  id: string
  text: string
  kind: 'coins' | 'challenge' | 'action' | 'info'
}

/**
 * Visão de mesa que o cliente recebe. Na Fase 1 é preenchida com dados
 * ilustrativos locais; na Fase 4 virá do servidor, já filtrada por jogador.
 */
export interface TableView {
  players: PublicPlayer[]
  localPlayerId: string
  currentTurnPlayerId: string
  /** Cartas restantes na Corte (baralho central). */
  courtCount: number
  /** Cartas do próprio jogador local (informação privada). */
  myInfluences: Influence[]
  log: LogEntry[]
}
