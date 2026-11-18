import { useState } from 'react'
import { useNow } from '../../hooks/useNow'
import { AnimatePresence, motion } from 'motion/react'
import { ACTIONS } from '../../game/rules/actions'
import { INFLUENCES } from '../../game/constants/influences'
import type { ActionType, InfluenceCard, PlayerView, Prompt } from '../../game/types/engine'
import { describeAction, withArticle } from '../../services/eventText'
import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { cardImageUrl } from '../../utils/cardImage'
import { Portrait } from './Portrait'

/**
 * Painel central de decisões: escolha de alvo, respostas (contestar, bloquear,
 * permitir), perda de influência e troca do Embaixador.
 * Mostra apenas as opções que a situação real permite (GDD §9.3).
 */
export function DecisionPanel() {
  const view = useGameStore((s) => s.view)
  const targeting = useInterfaceStore((s) => s.targeting)
  if (!view || view.phase.kind === 'game_over') return null
  const prompt = view.prompt

  let content: React.ReactNode = null
  let key = 'none'
  if (prompt?.kind === 'choose_action' && targeting) {
    key = `target-${targeting}`
    content = <TargetSelector view={view} prompt={prompt} action={targeting} />
  } else if (prompt && prompt.kind !== 'choose_action') {
    key = `${prompt.kind}-${view.turn}-${view.phase.kind}`
    content = <PromptContent view={view} prompt={prompt} />
  }

  return (
    <div className="decision-anchor">
      <AnimatePresence mode="wait">
        {content && (
          <motion.div
            key={key}
            className="decision"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function useNames(view: PlayerView) {
  return (id: string) => (id === view.viewerId ? 'Você' : (view.players.find((p) => p.id === id)?.name ?? id))
}

// a ação vem por props: durante a animação de saída a store já pode estar sem alvo
function TargetSelector({
  view,
  prompt,
  action: targeting,
}: {
  view: PlayerView
  prompt: Extract<Prompt, { kind: 'choose_action' }>
  action: ActionType
}) {
  const setTargeting = useInterfaceStore((s) => s.setTargeting)
  const send = useGameStore((s) => s.send)
  const looks = useGameStore((s) => s.looks)
  const def = ACTIONS[targeting]
  return (
    <>
      <div className="decision__eyebrow">{def.label}</div>
      <h2 className="decision__title">Escolha o alvo</h2>
      <p className="decision__text">Clique em um jogador aqui ou na plaquinha sobre ele, na mesa.</p>
      <div className="target-list">
        {prompt.targets.map((id) => {
          const p = view.players.find((x) => x.id === id)!
          return (
            <button
              key={id}
              className="target"
              onClick={() => {
                send({ type: 'declare_action', action: targeting, targetId: id })
                setTargeting(null)
              }}
            >
              <Portrait look={looks[p.id]} name={p.name} size={34} />
              <span className="target__name">{p.name}</span>
              <span className="target__meta">
                <span className="coin-chip" /> {p.coins} · {p.hiddenInfluenceCount} infl.
              </span>
            </button>
          )
        })}
      </div>
      <div className="decision__actions">
        <button className="btn btn--ghost" onClick={() => setTargeting(null)}>
          Cancelar
        </button>
      </div>
    </>
  )
}

function PromptContent({ view, prompt }: { view: PlayerView; prompt: Exclude<Prompt, { kind: 'choose_action' }> }) {
  const send = useGameStore((s) => s.send)
  const name = useNames(view)

  switch (prompt.kind) {
    case 'respond_action': {
      const a = prompt.action
      const targetsMe = a.targetId === view.viewerId
      return (
        <>
          <div className="decision__eyebrow">{targetsMe ? 'Você é o alvo' : 'Responder'}</div>
          <h2 className="decision__title">{describeAction(a, name)}</h2>
          <p className="decision__text">
            Acha que é blefe? Contestar coloca uma influência sua em risco: se {name(a.actorId)} tiver {withArticle(prompt.claim)}, quem
            perde é você.
          </p>
          <div className="decision__actions">
            <button className="btn btn--danger" onClick={() => send({ type: 'challenge' })}>
              Contestar
            </button>
            <button className="btn" onClick={() => send({ type: 'pass' })}>
              {ACTIONS[a.type].blockers === 'target' && targetsMe ? 'Não contestar' : 'Permitir'}
            </button>
          </div>
          <Countdown />
        </>
      )
    }
    case 'respond_block_window': {
      const a = prompt.action
      return (
        <>
          <div className="decision__eyebrow">{a.targetId === view.viewerId ? 'Você é o alvo' : 'Bloquear?'}</div>
          <h2 className="decision__title">{describeAction(a, name)}</h2>
          <p className="decision__text">Você pode bloquear declarando uma destas influências, mesmo sem tê-la (blefe).</p>
          <div className="decision__actions">
            {prompt.blockClaims.map((claim) => (
              <button key={claim} className="btn btn--gold" onClick={() => send({ type: 'block', claim })}>
                Bloquear com {INFLUENCES[claim].name}
              </button>
            ))}
            <button className="btn" onClick={() => send({ type: 'pass' })}>
              Permitir
            </button>
          </div>
          <Countdown />
        </>
      )
    }
    case 'respond_block': {
      const b = prompt.block
      return (
        <>
          <div className="decision__eyebrow">Bloqueio</div>
          <h2 className="decision__title">
            {name(b.blockerId)} bloqueou com {withArticle(b.claim)}
          </h2>
          <p className="decision__text">
            {ACTIONS[prompt.action.type].label} de {name(prompt.action.actorId)} será cancelado se ninguém contestar.
          </p>
          <div className="decision__actions">
            <button className="btn btn--danger" onClick={() => send({ type: 'challenge' })}>
              Contestar bloqueio
            </button>
            <button className="btn" onClick={() => send({ type: 'pass' })}>
              Aceitar
            </button>
          </div>
          <Countdown />
        </>
      )
    }
    case 'lose_influence':
      return (
        <>
          <div className="decision__eyebrow">{LOSS_TEXT[prompt.reason]}</div>
          <h2 className="decision__title">Escolha a influência que vai perder</h2>
          <p className="decision__text">A carta escolhida será revelada a todos e fica virada na mesa.</p>
          <div className="card-choice">
            {prompt.cards.map((c) => (
              <button key={c.id} className="card-option" onClick={() => send({ type: 'choose_influence', cardId: c.id })}>
                <img src={cardImageUrl(c.influence)} alt={INFLUENCES[c.influence].name} />
                <span>Revelar</span>
              </button>
            ))}
          </div>
        </>
      )
    case 'exchange':
      return <ExchangeChoice cards={prompt.cards} keep={prompt.keep} />
  }
}

const LOSS_TEXT = {
  coup: 'Golpe de Estado',
  assassinated: 'Assassinato',
  lost_challenge: 'Contestação perdida',
  caught_bluffing: 'Blefe descoberto',
} as const

function ExchangeChoice({ cards, keep }: { cards: InfluenceCard[]; keep: number }) {
  const send = useGameStore((s) => s.send)
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < keep ? [...s, id] : [...s.slice(1), id]))
  return (
    <>
      <div className="decision__eyebrow">Embaixador</div>
      <h2 className="decision__title">
        Escolha {keep} carta{keep > 1 ? 's' : ''} para manter
      </h2>
      <p className="decision__text">As outras voltam embaralhadas para a Corte. Só você vê estas cartas.</p>
      <div className="card-choice">
        {cards.map((c) => (
          <button key={c.id} className={`card-option ${selected.includes(c.id) ? 'is-selected' : ''}`} onClick={() => toggle(c.id)}>
            <img src={cardImageUrl(c.influence)} alt={INFLUENCES[c.influence].name} />
            <span>{selected.includes(c.id) ? 'Manter' : 'Devolver'}</span>
          </button>
        ))}
      </div>
      <div className="decision__actions">
        <button className="btn btn--gold" disabled={selected.length !== keep} onClick={() => send({ type: 'exchange_keep', cardIds: selected })}>
          Confirmar troca
        </button>
      </div>
    </>
  )
}

/** Barra do tempo restante para responder. */
function Countdown() {
  const deadline = useGameStore((s) => s.deadline)
  const now = useNow(!!deadline, 200)
  if (!deadline) return null
  const left = Math.max(0, deadline.at - now)
  return (
    <div className="countdown" aria-label={`${Math.ceil(left / 1000)} segundos`}>
      <div className="countdown__bar" style={{ width: `${(left / deadline.total) * 100}%` }} />
      <span>{Math.ceil(left / 1000)}s · sem resposta conta como “permitir”</span>
    </div>
  )
}
