import { AnimatePresence, motion } from 'motion/react'
import type { PlayerView } from '../../game/types/engine'
import { describeAction, withArticle } from '../../services/eventText'
import { useGameStore } from '../../stores/gameStore'

/** Linha no topo que diz, em palavras, o que está acontecendo agora. */
export function StatusBanner() {
  const view = useGameStore((s) => s.view)
  if (!view) return null
  const { title, detail } = describe(view)
  return (
    <div className="status-banner" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={title}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
        >
          <strong>{title}</strong>
          {detail && <span>{detail}</span>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function describe(view: PlayerView): { title: string; detail?: string } {
  const name = (id: string) => (id === view.viewerId ? 'Você' : (view.players.find((p) => p.id === id)?.name ?? id))
  const ph = view.phase
  const others = ph.waitingOn.filter((id) => id !== view.viewerId).map(name)
  const waiting = others.length ? `aguardando ${others.join(', ')}` : undefined

  switch (ph.kind) {
    case 'awaiting_action':
      return view.currentPlayerId === view.viewerId ? { title: 'Sua vez', detail: 'escolha uma ação' } : { title: `Vez de ${name(view.currentPlayerId)}` }
    case 'action_challenge_window':
      return { title: describeAction(ph.action!, name), detail: waiting && `alguém contesta? ${waiting}` }
    case 'block_window':
      return { title: describeAction(ph.action!, name), detail: waiting && `bloqueio? ${waiting}` }
    case 'block_challenge_window':
      return { title: `${name(ph.block!.blockerId)} bloqueou com ${withArticle(ph.block!.claim)}`, detail: waiting && `alguém contesta? ${waiting}` }
    case 'choosing_influence_loss':
      return { title: `${name(ph.lossPlayerId!)} vai perder uma influência`, detail: ph.lossPlayerId === view.viewerId ? undefined : 'escolhendo a carta' }
    case 'choosing_exchange':
      return { title: `${name(ph.action!.actorId)} está trocando cartas com a Corte` }
    case 'game_over':
      return { title: 'Fim de jogo' }
  }
}
