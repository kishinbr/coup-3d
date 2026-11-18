import { create } from 'zustand'
import type { Command, PlayerView } from '../game/types/engine'
import type { LogEntry } from '../game/types/game'
import type { AvatarLook } from '../game/types/player'
import { MATERIAL_COLORS } from '../game/constants/palette'
import { HUMAN_ID, LocalGame } from '../services/localGame'
import { eventToLog } from '../services/eventText'
import { useInterfaceStore } from './interfaceStore'

/**
 * Estado do cliente. Guarda apenas a PlayerView (o que o jogador pode saber)
 * e o registro. O estado completo da partida fica dentro do LocalGame
 * (e, na Fase 4, no servidor).
 */

export const AVATAR_LOOKS: Record<string, AvatarLook> = {
  lucas: { skin: MATERIAL_COLORS.skinTan, hair: '#1b1210', hairStyle: 'slick', outfit: '#2b201b', outfitAccent: '#C59B53', shirt: '#e9e0d0' },
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
  helena: {
    skin: '#8d5a3f',
    hair: '#151010',
    hairStyle: 'bun',
    outfit: '#1f4a3a',
    outfitAccent: '#E2BC76',
    shirt: '#1f4a3a',
    dress: true,
  },
  otavio: {
    skin: MATERIAL_COLORS.skinLight,
    hair: '#5a3a22',
    hairStyle: 'swept',
    outfit: '#4a1d24',
    outfitAccent: '#C59B53',
    shirt: '#e9e0d0',
    beard: true,
  },
}

type Status = 'lobby' | 'playing'

interface GameStore {
  status: Status
  view: PlayerView | null
  seats: Record<string, number>
  log: LogEntry[]
  responseDeadline: number | null
  /** Última configuração, para "jogar de novo". */
  lastConfig: { playerName: string; botCount: number }
  startLocal: (playerName: string, botCount: number) => void
  send: (command: Command) => void
  backToLobby: () => void
}

let game: LocalGame | null = null

export const useGameStore = create<GameStore>((set) => ({
  status: 'lobby',
  view: null,
  seats: {},
  log: [],
  responseDeadline: null,
  lastConfig: { playerName: 'Você', botCount: 3 },

  startLocal: (playerName, botCount) => {
    game?.dispose()
    set({ status: 'playing', log: [], view: null, lastConfig: { playerName, botCount } })
    useInterfaceStore.getState().resetForNewGame()
    game = new LocalGame({ playerName, botCount }, (snap) => {
      const names = new Map(snap.view.players.map((p) => [p.id, p.name]))
      const name = (id: string) => names.get(id) ?? id
      const entries = snap.events.map((e) => eventToLog(e, name, HUMAN_ID)).filter((e): e is LogEntry => e !== null)
      set((s) => ({
        view: snap.view,
        seats: snap.seats,
        responseDeadline: snap.responseDeadline,
        log: [...s.log, ...entries].slice(-60),
      }))
      // se o prompt de escolher alvo sumiu, sai do modo de seleção
      if (snap.view.prompt?.kind !== 'choose_action') useInterfaceStore.getState().setTargeting(null)
    })
  },

  send: (command) => {
    if (!game) return
    const error = game.send(command)
    if (error) useInterfaceStore.getState().showToast(error)
  },

  backToLobby: () => {
    game?.dispose()
    game = null
    set({ status: 'lobby', view: null, log: [], responseDeadline: null })
    useInterfaceStore.getState().resetForNewGame()
  },
}))
