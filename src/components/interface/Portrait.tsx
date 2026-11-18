import { AVATAR_LOOKS } from '../../stores/gameStore'

/**
 * Medalhão de retrato com monograma. Provisório: na Fase 2 recebe
 * um render do rosto de cada personagem.
 */
export function Portrait({ id, name, size = 44, active = false }: { id: string; name: string; size?: number; active?: boolean }) {
  const look = AVATAR_LOOKS[id]
  const tone = look?.outfit ?? '#3a2a22'
  return (
    <div
      className={`portrait ${active ? 'is-active' : ''}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${look?.skin ?? '#b58b6a'} 0%, ${tone} 75%)`,
        fontSize: size * 0.42,
      }}
    >
      <span>{name.charAt(0)}</span>
    </div>
  )
}
