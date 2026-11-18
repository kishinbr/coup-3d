import { create } from 'zustand'
import type { Command, GameEvent, PlayerView } from '../game/types/engine'
import type { LogEntry } from '../game/types/game'
import type { AvatarLook } from '../game/types/player'
import type { RoomInfo, ServerMessage } from '../game/types/protocol'
import { MATERIAL_COLORS } from '../game/constants/palette'
import { looksFor, seatsFor } from '../game/constants/seating'
import { LocalGame } from '../services/localGame'
import { OnlineRoom, createRoom, roomExists, saveSession, type ConnectionStatus, type SavedSession } from '../services/onlineRoom'
import { eventToLog } from '../services/eventText'
import { useInterfaceStore } from './interfaceStore'

/**
 * Estado do cliente, para os dois modos (local contra bots e online).
 * Guarda apenas a PlayerView: o que este jogador pode saber.
 * O estado completo da partida fica no LocalGame ou no servidor.
 */

export const AVATAR_LOOKS: Record<string, AvatarLook> = {
  lucas: { skin: MATERIAL_COLORS.skinTan, hair: '#1b1210', hairStyle: 'slick', outfit: '#2b201b', outfitAccent: '#C59B53', shirt: '#e9e0d0' },
  marina: { skin: MATERIAL_COLORS.skinLight, hair: '#6e2a17', hairStyle: 'bun', outfit: '#8e1c26', outfitAccent: '#E2BC76', shirt: '#8e1c26', dress: true },
  rafael: { skin: MATERIAL_COLORS.skinMedium, hair: '#c9c2b8', hairStyle: 'swept', outfit: '#25345a', outfitAccent: '#C59B53', shirt: '#2b2f3a', beard: true },
  helena: { skin: '#8d5a3f', hair: '#151010', hairStyle: 'bun', outfit: '#1f4a3a', outfitAccent: '#E2BC76', shirt: '#1f4a3a', dress: true },
  otavio: { skin: MATERIAL_COLORS.skinLight, hair: '#5a3a22', hairStyle: 'swept', outfit: '#4a1d24', outfitAccent: '#C59B53', shirt: '#e9e0d0', beard: true },
}

type Status = 'menu' | 'room' | 'playing'
type Mode = 'local' | 'online'

interface GameStore {
  status: Status
  mode: Mode | null
  view: PlayerView | null
  seats: Record<string, number>
  looks: Record<string, string | null>
  log: LogEntry[]
  deadline: { at: number; total: number } | null
  /** Online: sala atual, quem sou eu e o estado da conexão. */
  room: RoomInfo | null
  myId: string | null
  connection: ConnectionStatus | null
  /** Mensagem exibida no menu (ex.: "sala não encontrada"). */
  menuError: string | null
  busy: boolean
  playerName: string
  lastLocal: { botCount: number }

  setPlayerName: (name: string) => void
  startLocal: (botCount: number) => void
  createOnline: () => Promise<void>
  joinOnline: (code: string) => Promise<void>
  resumeOnline: (session: SavedSession) => void
  send: (command: Command) => void
  roomAction: (msg: { t: 'start' } | { t: 'add_bot' } | { t: 'restart' } | { t: 'remove_player'; playerId: string }) => void
  leave: () => void
}

let local: LocalGame | null = null
let online: OnlineRoom | null = null

const NAME_KEY = 'coup3d:name'
function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

function disposeAll() {
  local?.dispose()
  local = null
  online?.dispose()
  online = null
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Aplica uma nova visão + eventos (comum aos dois modos). */
  const applyView = (view: PlayerView, events: GameEvent[], deadline: GameStore['deadline']) => {
    const ids = view.players.map((p) => p.id)
    const seats = seatsFor(ids, view.viewerId)
    const looks = looksFor(ids, seats, view.viewerId)
    const names = new Map(view.players.map((p) => [p.id, p.name]))
    const name = (id: string) => names.get(id) ?? id
    const entries = events.map((e) => eventToLog(e, name, view.viewerId)).filter((e): e is LogEntry => e !== null)
    const restarted = events.some((e) => e.type === 'GAME_STARTED')
    set((s) => ({
      status: 'playing',
      view,
      seats,
      looks,
      deadline,
      log: [...(restarted ? [] : s.log), ...entries].slice(-60),
    }))
    if (view.prompt?.kind !== 'choose_action') useInterfaceStore.getState().setTargeting(null)
    if (restarted) useInterfaceStore.getState().resetForNewGame()
  }

  const onServerMessage = (msg: ServerMessage) => {
    switch (msg.t) {
      case 'welcome':
        set({ myId: msg.playerId, room: msg.room, menuError: null, busy: false })
        break
      case 'room':
        set({ room: msg.room, status: msg.room.status === 'lobby' ? 'room' : get().status, view: msg.room.status === 'lobby' ? null : get().view })
        break
      case 'state':
        set({ room: msg.room })
        applyView(msg.view, msg.events, msg.deadline ? { at: Date.now() + msg.deadline.msLeft, total: msg.deadline.total } : null)
        break
      case 'error':
        useInterfaceStore.getState().showToast(msg.message)
        break
    }
  }

  const connect = (code: string, token: string | null) => {
    disposeAll()
    set({ mode: 'online', status: 'room', room: null, view: null, log: [], myId: null, menuError: null, busy: true })
    useInterfaceStore.getState().resetForNewGame()
    online = new OnlineRoom(code, get().playerName || 'Jogador', token, {
      onMessage: onServerMessage,
      onStatus: (connection) => set({ connection }),
      onFatal: (message) => {
        disposeAll()
        set({ status: 'menu', mode: null, room: null, view: null, menuError: message, busy: false, connection: null })
        clearRoomFromUrl()
      },
    })
    setRoomInUrl(code)
  }

  return {
    status: 'menu',
    mode: null,
    view: null,
    seats: {},
    looks: {},
    log: [],
    deadline: null,
    room: null,
    myId: null,
    connection: null,
    menuError: null,
    busy: false,
    playerName: savedName(),
    lastLocal: { botCount: 3 },

    setPlayerName: (name) => {
      set({ playerName: name })
      try {
        localStorage.setItem(NAME_KEY, name)
      } catch {
        /* ignorado */
      }
    },

    startLocal: (botCount) => {
      disposeAll()
      set({ status: 'playing', mode: 'local', log: [], view: null, room: null, lastLocal: { botCount }, menuError: null })
      useInterfaceStore.getState().resetForNewGame()
      local = new LocalGame({ playerName: get().playerName || 'Você', botCount }, (snap) => applyView(snap.view, snap.events, snap.deadline))
    },

    createOnline: async () => {
      set({ busy: true, menuError: null })
      try {
        const code = await createRoom()
        connect(code, null)
      } catch (e) {
        set({ busy: false, menuError: e instanceof Error ? e.message : 'Erro ao criar a sala.' })
      }
    },

    joinOnline: async (code) => {
      set({ busy: true, menuError: null })
      try {
        if (!(await roomExists(code))) {
          set({ busy: false, menuError: `A sala ${code} não existe (ou já foi encerrada).` })
          return
        }
        connect(code, null)
      } catch {
        set({ busy: false, menuError: 'Não foi possível falar com o servidor.' })
      }
    },

    resumeOnline: (session) => {
      if (!get().playerName) set({ playerName: session.name })
      connect(session.code, session.token)
    },

    send: (command) => {
      if (local) {
        const error = local.send(command)
        if (error) useInterfaceStore.getState().showToast(error)
      } else online?.command(command)
    },

    roomAction: (msg) => online?.send(msg),

    leave: () => {
      online?.leave()
      saveSession(null)
      disposeAll()
      clearRoomFromUrl()
      set({ status: 'menu', mode: null, view: null, room: null, log: [], deadline: null, myId: null, connection: null })
      useInterfaceStore.getState().resetForNewGame()
    },
  }
})

/* O código da sala fica no endereço (?sala=ABCDE), para compartilhar o link. */
function setRoomInUrl(code: string) {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('sala', code)
    window.history.replaceState(null, '', url)
  } catch {
    /* alguns ambientes (iframes) não permitem mudar o endereço */
  }
}

function clearRoomFromUrl() {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('sala')
    window.history.replaceState(null, '', url)
  } catch {
    /* idem */
  }
}

/** Link para convidar amigos para a sala. */
export function inviteLink(code: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('sala', code)
  return url.toString()
}
