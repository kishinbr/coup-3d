import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { IconAlert, IconCoin, IconInfo, IconSwap } from './Icons'

const ICON = {
  coins: <IconCoin />,
  challenge: <IconAlert />,
  action: <IconSwap />,
  info: <IconInfo />,
}

/** Registro das últimas jogadas, à esquerda (GDD §9 / referência visual). */
export function GameLog() {
  const log = useGameStore((s) => s.table.log)
  return (
    <aside className="game-log" aria-label="Registro da partida">
      <AnimatePresence initial>
        {log.slice(-4).map((entry, i) => (
          <motion.div
            key={entry.id}
            className={`log-entry log-entry--${entry.kind}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.12, duration: 0.45 }}
          >
            <span className="log-entry__icon">{ICON[entry.kind]}</span>
            <span>{entry.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </aside>
  )
}
