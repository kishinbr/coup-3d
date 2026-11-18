import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useInterfaceStore } from '../../stores/interfaceStore'
import { PlayingCard } from '../game/PlayingCard'

/**
 * Consulta privada das próprias cartas (GDD §7.3).
 * As cartas acompanham a câmera e são desenhadas por cima da cena.
 * Este componente só existe no cliente do próprio jogador: nada aqui é sincronizado.
 */
export function HeldCards() {
  const { camera } = useThree()
  const group = useRef<THREE.Group>(null)
  const cards = useRef<(THREE.Group | null)[]>([])
  const progress = useRef(0)
  const influences = useGameStore((s) => s.table.myInfluences)

  useFrame(({ clock }, delta) => {
    const open = useInterfaceStore.getState().cardsOpen
    progress.current = THREE.MathUtils.damp(progress.current, open ? 1 : 0, open ? 7 : 10, delta)
    const p = progress.current
    const g = group.current
    if (!g) return
    g.visible = p > 0.01
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    const e = 1 - Math.pow(1 - p, 3)
    const n = influences.length
    cards.current.forEach((card, i) => {
      if (!card) return
      const k = i - (n - 1) / 2
      card.position.set(k * 0.095 * e, -0.36 + 0.285 * e + Math.abs(k) * -0.01, -0.42 + i * 0.001)
      card.rotation.set(-0.12 * (1 - e), k * -0.12, k * -0.11 * e + Math.sin(clock.elapsedTime * 1.2 + i) * 0.004)
    })
  })

  return (
    <group ref={group} visible={false}>
      {influences.map((inf, i) => (
        <group key={i} ref={(el) => void (cards.current[i] = el)} scale={1.5}>
          <PlayingCard influence={inf} overlay />
        </group>
      ))}
    </group>
  )
}
