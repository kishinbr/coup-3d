import type { Command, GameEvent, PlayerView } from './engine'

/* =====================================================================
 * Protocolo do multiplayer (WebSocket, JSON). Compartilhado entre o
 * navegador e o servidor. O cliente só envia INTENÇÕES; quem decide
 * tudo é o servidor (GDD §11).
 * ===================================================================== */

export type ClientMessage =
  | { t: 'join'; name: string; token?: string }
  | { t: 'start' }
  | { t: 'add_bot' }
  | { t: 'remove_player'; playerId: string }
  | { t: 'command'; cmd: Command }
  | { t: 'restart' }
  | { t: 'leave' }
  | { t: 'ping' }

export type RoomStatus = 'lobby' | 'playing' | 'finished'

export interface LobbyPlayer {
  id: string
  name: string
  isBot: boolean
  connected: boolean
  isHost: boolean
}

export interface RoomInfo {
  code: string
  status: RoomStatus
  players: LobbyPlayer[]
  hostId: string | null
  maxPlayers: number
}

/** Tempo restante para o jogador agir. Relativo, para não depender do relógio do computador. */
export interface DeadlineInfo {
  msLeft: number
  total: number
}

export type ServerMessage =
  | { t: 'welcome'; playerId: string; token: string; room: RoomInfo }
  | { t: 'room'; room: RoomInfo }
  | { t: 'state'; room: RoomInfo; view: PlayerView; events: GameEvent[]; deadline: DeadlineInfo | null }
  | { t: 'error'; message: string; fatal?: boolean }
  | { t: 'pong' }

/** Tempos do modo online. */
export const TIMEOUTS = {
  /** Contestar / bloquear / permitir. */
  response: 15_000,
  /** Escolher a ação do turno. */
  action: 60_000,
  /** Escolher qual influência perder, ou quais cartas manter na troca. */
  choice: 30_000,
  /** Qualquer decisão de um jogador desconectado. */
  disconnected: 8_000,
} as const

export const ROOM_CODE_LENGTH = 5
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const MAX_NAME_LENGTH = 16

export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH)
}
