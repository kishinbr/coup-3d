import { AVATAR_LOOKS } from '../../stores/gameStore'

/**
 * Medalhão de retrato com monograma, nas cores do visual do personagem.
 * Provisório: na fase visual recebe um render do rosto.
 */
export function Portrait({ look, name, size = 44, active = false }: { look?: string | null; name: string; size?: number; active?: boolean }) {
  const l = look ? AVATAR_LOOKS[look] : undefined
  const tone = l?.outfit ?? '#3a2a22'
  return (
    <div
      className={`portrait ${active ? 'is-active' : ''}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${l?.skin ?? '#b58b6a'} 0%, ${tone} 75%)`,
        fontSize: size * 0.42,
      }}
    >
      <span>{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}
