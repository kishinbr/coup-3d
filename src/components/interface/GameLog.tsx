import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { IconAlert, IconCoin, IconInfo, IconSwap } from './Icons'

const ICON = {
  coins: <IconCoin />,
  challenge: <IconAlert />,
  action: <IconSwap />,
  info: <IconInfo />,
}

/** Registro das últimas jogadas, à esquerda. A mais recente fica embaixo. */
export function GameLog() {
  const log = useGameStore((s) => s.log)
  return (
    <aside className="game-log" aria-label="Registro da partida">
      <AnimatePresence initial={false}>
        {log.slice(-6).map((entry) => (
          <motion.div
            key={entry.id}
            layout
            className={`log-entry log-entry--${entry.kind}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -8 }}
            transition={{ duration: 0.3 }}
          >
            <span className="log-entry__icon">{ICON[entry.kind]}</span>
            <span>{entry.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </aside>
  )
}
