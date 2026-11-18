import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { normalizeRoomCode } from '../../game/types/protocol'
import { loadSession } from '../../services/onlineRoom'
import { useNow } from '../../hooks/useNow'
import { useCameraStore } from '../../stores/cameraStore'
import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { ActionPanel } from './ActionPanel'
import { DecisionPanel } from './DecisionPanel'
import { GameLog } from './GameLog'
import { GameOver } from './GameOver'
import { MainMenu } from './MainMenu'
import { PlayerTags } from './PlayerTags'
import { Portrait } from './Portrait'
import { RoomLobby } from './RoomLobby'
import { StatusBanner } from './StatusBanner'

/**
 * HUD sobre a cena (GDD §9): informação persistente no alto e embaixo,
 * ações à direita, registro à esquerda e decisões no centro.
 */
export function GameHUD() {
  const status = useGameStore((s) => s.status)
  const view = useGameStore((s) => s.view)
  const mode = useGameStore((s) => s.mode)
  const connection = useGameStore((s) => s.connection)
  const leave = useGameStore((s) => s.leave)
  const roomCode = useGameStore((s) => s.room?.code)
  const initialCode = useInitialRoom()
  const locked = useCameraStore((s) => s.locked)
  const { cardsOpen, toast, setCardsOpen } = useInterfaceStore()
  const me = view?.players.find((p) => p.id === view.viewerId)
  const turnPlayer = view?.players.find((p) => p.id === view.currentPlayerId)
  const playing = status === 'playing' && view

  return (
    <div className={`hud ${locked ? 'is-locked' : ''}`}>
      <div className="vignette" />
      {playing && <PlayerTags />}

      <header className="hud-top">
        <div className="brand">
          <Logo />
        </div>
        {playing && <StatusBanner />}
        {playing && turnPlayer && (
          <motion.div className="turn-indicator" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <span>
              {turnPlayer.id === view.viewerId ? (
                <strong>Sua vez</strong>
              ) : (
                <>
                  Vez de <strong>{turnPlayer.name}</strong>
                </>
              )}
            </span>
            <TurnRing />
          </motion.div>
        )}
      </header>

      {playing && (
        <>
          <GameLog />
          <ActionPanel />
          <DecisionPanel />
        </>
      )}

      {playing && (
        <footer className="hud-bottom">
          {me && (
            <div className="me-stack">
              <div className="brand__row">
                <div className="prototype-badge">{mode === 'online' ? `Sala ${roomCode ?? ''}` : 'Contra bots'}</div>
                <button className="link-btn" onClick={leave}>
                  Sair
                </button>
              </div>
              <motion.div
                className={`me-card ${me.eliminated ? 'is-out' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Portrait name={me.name} size={64} active={view.currentPlayerId === me.id} />
                <div>
                  <div className="me-card__name">{me.name}</div>
                  <div className="me-card__stats">
                    {me.eliminated ? (
                      <span className="me-card__label">fora da partida · assistindo</span>
                    ) : (
                      <>
                        <span className="coin-chip coin-chip--lg" />
                        <b>{me.coins}</b>
                        <span className="me-card__sep" />
                        <span className="influence-pips influence-pips--lg">
                          {Array.from({ length: 2 }, (_, i) => (
                            <i key={i} className={i < me.hiddenInfluenceCount ? 'on' : ''} />
                          ))}
                        </span>
                        <span className="me-card__label">influências</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {cardsOpen ? (
              <motion.button
                key="close"
                className="hint hint--button"
                onClick={() => setCardsOpen(false)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                Suas influências são privadas · <b>Guardar cartas</b> (C ou ESC)
              </motion.button>
            ) : (
              !view.prompt && (
                <motion.div
                  key="hint"
                  className="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: locked ? 0.55 : 1 }}
                  exit={{ opacity: 0 }}
                >
                  {locked ? (
                    <>
                      <kbd>ESC</kbd> libera o cursor
                    </>
                  ) : (
                    <>
                      Clique na cena para olhar ao redor · <kbd>C</kbd> mostra suas cartas
                    </>
                  )}
                </motion.div>
              )
            )}
          </AnimatePresence>
        </footer>
      )}

      {locked && <div className="crosshair" />}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'online' && connection && connection !== 'open' && status === 'playing' && (
        <div className="conn-banner">{connection === 'reconnecting' ? 'Conexão perdida · reconectando…' : 'Conectando…'}</div>
      )}

      {status === 'menu' && <MainMenu initialCode={initialCode} />}
      {status === 'room' && <RoomLobby />}
      {playing && <GameOver />}
    </div>
  )
}

function Logo() {
  return (
    <div className="logo" aria-label="Coup 3D">
      <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden>
        <path d="M3 20 L2 7 L10 13 L17 3 L24 13 L32 7 L31 20 Z" fill="url(#lg)" />
        <rect x="3" y="21" width="28" height="2.4" fill="url(#lg)" />
        <defs>
          <linearGradient id="lg" x1="0" x2="1">
            <stop offset="0" stopColor="#8a6630" />
            <stop offset="0.45" stopColor="#E2BC76" />
            <stop offset="1" stopColor="#9c7638" />
          </linearGradient>
        </defs>
      </svg>
      <span>COUP</span>
    </div>
  )
}

/**
 * Ao abrir o site: volta para a sala em que você estava (mesmo depois de recarregar a página)
 * ou preenche o código vindo de um link de convite (?sala=ABCDE).
 */
function useInitialRoom(): string {
  const [code] = useState(() => {
    try {
      return normalizeRoomCode(new URL(window.location.href).searchParams.get('sala') ?? '')
    } catch {
      return ''
    }
  })
  useEffect(() => {
    const session = loadSession()
    if (session && (!code || code === session.code) && useGameStore.getState().status === 'menu') {
      useGameStore.getState().resumeOnline(session)
    }
  }, [code])
  return code
}

/** Anel do prazo: aparece quando a partida está esperando uma decisão sua. */
function TurnRing() {
  const deadline = useGameStore((s) => s.deadline)
  const turn = useGameStore((s) => s.view?.turn ?? 0)
  const now = useNow(!!deadline)
  const r = 19
  const c = 2 * Math.PI * r
  const left = deadline ? Math.max(0, deadline.at - now) : 0
  const frac = deadline ? left / deadline.total : 1
  return (
    <div className="turn-ring" title={deadline ? 'Tempo para responder' : 'Turno'}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} className="turn-ring__track" />
        <circle
          cx="24"
          cy="24"
          r={r}
          className={`turn-ring__value ${deadline ? 'is-timer' : ''}`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span>{deadline ? Math.ceil(left / 1000) : turn}</span>
    </div>
  )
}
