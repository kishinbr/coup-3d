import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TABLE, seatAngle } from '../../game/constants/table'
import { PALETTE } from '../../game/constants/palette'

const ARC = 0.7

/** Arco dourado pulsante no feltro, diante do jogador da vez (GDD §8.7). */
export function TurnMarker({ seat }: { seat: number }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PALETTE.highlight,
        emissive: PALETTE.highlight,
        emissiveIntensity: 1.5,
        toneMapped: false,
        transparent: true,
      }),
    [],
  )
  useFrame(({ clock }) => {
    const s = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2)
    material.emissiveIntensity = 0.8 + s * 1.4
    material.opacity = 0.55 + s * 0.4
  })
  // o arco do toro começa no ângulo de assento π/2; a rotação em Y o centraliza no assento
  const beta = seatAngle(seat) - Math.PI / 2 - ARC / 2
  return (
    <group rotation-y={beta} position-y={TABLE.surfaceY + 0.003}>
      <mesh material={material} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[TABLE.feltRadius - 0.06, 0.006, 6, 64, ARC]} />
      </mesh>
    </group>
  )
}
