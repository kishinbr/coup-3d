import { AnimatePresence, motion } from 'motion/react'
import { useCameraStore } from '../../stores/cameraStore'
import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { ActionPanel } from './ActionPanel'
import { GameLog } from './GameLog'
import { Portrait } from './Portrait'

/**
 * HUD minimalista sobre a cena (GDD §9.1): informação persistente nas faixas
 * superior e inferior, ações à direita e registro à esquerda.
 */
export function GameHUD() {
  const table = useGameStore((s) => s.table)
  const locked = useCameraStore((s) => s.locked)
  const { cardsOpen, toast, setCardsOpen } = useInterfaceStore()
  const me = table.players.find((p) => p.id === table.localPlayerId)
  const turnPlayer = table.players.find((p) => p.id === table.currentTurnPlayerId)

  return (
    <div className={`hud ${locked ? 'is-locked' : ''}`}>
      <div className="vignette" />

      <header className="hud-top">
        <div className="brand">
          <Logo />
          <div className="prototype-badge">Protótipo visual · Fase 1</div>
        </div>
        <motion.div className="turn-indicator" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span>
            Vez de <strong>{turnPlayer?.name}</strong>
          </span>
          <TurnRing seconds={28} total={40} />
        </motion.div>
      </header>

      <GameLog />
      <ActionPanel />

      <footer className="hud-bottom">
        {me && (
          <motion.div className="me-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Portrait id={me.id} name={me.name} size={64} />
            <div>
              <div className="me-card__name">{me.name}</div>
              <div className="me-card__stats">
                <span className="coin-chip coin-chip--lg" />
                <b>{me.coins}</b>
                <span className="me-card__sep" />
                <span className="influence-pips influence-pips--lg">
                  {Array.from({ length: 2 }, (_, i) => (
                    <i key={i} className={i < me.hiddenInfluenceCount ? 'on' : ''} />
                  ))}
                </span>
                <span className="me-card__label">influências</span>
              </div>
            </div>
          </motion.div>
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
            <motion.div key="hint" className="hint" initial={{ opacity: 0 }} animate={{ opacity: locked ? 0.55 : 1 }} exit={{ opacity: 0 }}>
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
          )}
        </AnimatePresence>
      </footer>

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

/** Anel do tempo de resposta. Na Fase 1 é estático (ilustrativo). */
function TurnRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 19
  const c = 2 * Math.PI * r
  return (
    <div className="turn-ring">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} className="turn-ring__track" />
        <circle
          cx="24"
          cy="24"
          r={r}
          className="turn-ring__value"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - seconds / total)}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span>{seconds}</span>
    </div>
  )
}
