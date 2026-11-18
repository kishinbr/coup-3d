import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { IconAnchor, IconCoin, IconCrown, IconDagger, IconEye, IconFist, IconHands, IconPlusCoin, IconSwap } from './Icons'

interface ActionDef {
  id: string
  label: string
  icon: ReactNode
  /** Ações de personagem são diferenciadas visualmente (sem revelar o que você tem). */
  character?: boolean
  cost?: number
}

const ACTIONS: ActionDef[] = [
  { id: 'income', label: 'Renda', icon: <IconPlusCoin /> },
  { id: 'foreign-aid', label: 'Ajuda Externa', icon: <IconHands /> },
  { id: 'coup', label: 'Golpe de Estado', icon: <IconFist />, cost: 7 },
  { id: 'tax', label: 'Taxar', icon: <IconCrown />, character: true },
  { id: 'assassinate', label: 'Assassinar', icon: <IconDagger />, character: true, cost: 3 },
  { id: 'steal', label: 'Roubar', icon: <IconAnchor />, character: true },
  { id: 'exchange', label: 'Trocar', icon: <IconSwap />, character: true },
]

/**
 * Painel de ações (GDD §9.2).
 * FASE 1: os botões de ação ainda NÃO executam regras. Eles avisam isso
 * explicitamente, em vez de fingir que algo aconteceu. "Ver cartas" funciona.
 */
export function ActionPanel() {
  const me = useGameStore((s) => s.table.players.find((p) => p.id === s.table.localPlayerId))
  const { cardsOpen, toggleCards, showToast } = useInterfaceStore()
  const coins = me?.coins ?? 0

  return (
    <motion.nav
      className="action-panel"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button className={`action action--primary ${cardsOpen ? 'is-on' : ''}`} onClick={toggleCards}>
        <IconEye />
        <span>{cardsOpen ? 'Guardar cartas' : 'Ver cartas'}</span>
        <kbd>C</kbd>
      </button>
      <div className="action-panel__rule" />
      {ACTIONS.map((a) => {
        const affordable = a.cost === undefined || coins >= a.cost
        return (
          <button
            key={a.id}
            className={`action ${a.character ? 'action--character' : ''}`}
            disabled={!affordable}
            title={affordable ? undefined : `Requer ${a.cost} moedas`}
            onClick={() => showToast(`“${a.label}” ganha regras na Fase 3. Por enquanto o botão é só visual.`)}
          >
            {a.icon}
            <span>{a.label}</span>
            {a.cost !== undefined && (
              <em className="action__cost">
                <IconCoin width={13} height={13} />
                {a.cost}
              </em>
            )}
          </button>
        )
      })}
    </motion.nav>
  )
}
