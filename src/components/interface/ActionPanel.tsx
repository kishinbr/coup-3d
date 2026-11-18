import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ACTIONS, ACTION_ORDER } from '../../game/rules/actions'
import { INFLUENCES } from '../../game/constants/influences'
import type { ActionType } from '../../game/types/engine'
import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { IconAnchor, IconCoin, IconCrown, IconDagger, IconEye, IconFist, IconHands, IconPlusCoin, IconSwap } from './Icons'

const ICONS: Record<ActionType, ReactNode> = {
  income: <IconPlusCoin />,
  foreign_aid: <IconHands />,
  coup: <IconFist />,
  tax: <IconCrown />,
  assassinate: <IconDagger />,
  steal: <IconAnchor />,
  exchange: <IconSwap />,
}

const HINTS: Record<ActionType, string> = {
  income: '+1 moeda. Não pode ser bloqueada nem contestada.',
  foreign_aid: '+2 moedas. Qualquer um pode bloquear dizendo ter o Duque.',
  coup: 'Paga 7: o alvo perde uma influência. Não pode ser bloqueado.',
  tax: '+3 moedas declarando o Duque. Pode ser contestado.',
  assassinate: 'Paga 3: o alvo perde uma influência. A Condessa bloqueia.',
  steal: 'Tira 2 moedas do alvo. Capitão ou Embaixador bloqueiam.',
  exchange: 'Compra 2 cartas da Corte e escolhe quais manter.',
}

/**
 * Painel de ações (GDD §9.2). Só habilita o que o motor de regras permite agora.
 * Ações de personagem têm destaque próprio, sem revelar quais cartas você tem:
 * declará-las sem a carta é um blefe.
 */
export function ActionPanel() {
  const prompt = useGameStore((s) => s.view?.prompt)
  const coins = useGameStore((s) => s.view?.players.find((p) => p.id === s.view?.viewerId)?.coins ?? 0)
  const send = useGameStore((s) => s.send)
  const { cardsOpen, toggleCards, targeting, setTargeting } = useInterfaceStore()
  const myTurn = prompt?.kind === 'choose_action'

  const onAction = (type: ActionType) => {
    if (!myTurn) return
    if (ACTIONS[type].needsTarget) setTargeting(targeting === type ? null : type)
    else {
      setTargeting(null)
      send({ type: 'declare_action', action: type })
    }
  }

  return (
    <motion.nav
      className={`action-panel ${myTurn ? 'is-my-turn' : ''}`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button className={`action action--primary ${cardsOpen ? 'is-on' : ''}`} onClick={toggleCards}>
        <IconEye />
        <span>{cardsOpen ? 'Guardar cartas' : 'Ver cartas'}</span>
        <kbd>C</kbd>
      </button>
      <div className="action-panel__rule">{myTurn ? <span>Sua vez</span> : null}</div>
      {ACTION_ORDER.map((type) => {
        const def = ACTIONS[type]
        const option = myTurn ? prompt.actions.find((a) => a.type === type) : undefined
        const enabled = !!option?.enabled
        const title = option?.reason ?? (myTurn ? HINTS[type] : 'Aguarde a sua vez')
        return (
          <button
            key={type}
            className={`action ${def.claim ? 'action--character' : ''} ${targeting === type ? 'is-on' : ''}`}
            disabled={!enabled}
            title={title}
            onClick={() => onAction(type)}
          >
            {ICONS[type]}
            <span>
              {def.label}
              {def.claim && <small>{INFLUENCES[def.claim].name}</small>}
            </span>
            {def.cost > 0 && (
              <em className={`action__cost ${coins < def.cost ? 'is-short' : ''}`}>
                <IconCoin width={13} height={13} />
                {def.cost}
              </em>
            )}
          </button>
        )
      })}
    </motion.nav>
  )
}
