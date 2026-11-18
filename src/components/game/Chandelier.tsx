import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { PALETTE } from '../../game/constants/palette'

type Props = ThreeElements['group'] & { dim?: boolean }

/** Lustre dourado com velas. A luz real fica em Lighting; aqui só há brilho emissivo. */
export function Chandelier({ dim = false, ...group }: Props) {
  const m = useMemo(
    () => ({
      gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.3 }),
      flame: new THREE.MeshStandardMaterial({
        color: '#ffd59a',
        emissive: '#ffb45e',
        emissiveIntensity: dim ? 2.5 : 4,
        toneMapped: false,
      }),
      crystal: new THREE.MeshStandardMaterial({
        color: '#fff1d6',
        metalness: 0.2,
        roughness: 0.05,
        transparent: true,
        opacity: 0.75,
        emissive: '#8a5a2a',
        emissiveIntensity: 0.4,
      }),
    }),
    [dim],
  )
  const arms = 8
  return (
    <group {...group}>
      {/* corrente */}
      <mesh material={m.gold} position-y={0.75}>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 6]} />
      </mesh>
      <mesh material={m.gold}>
        <sphereGeometry args={[0.09, 16, 12]} />
      </mesh>
      <mesh material={m.gold} position-y={-0.14}>
        <coneGeometry args={[0.07, 0.2, 16]} />
      </mesh>
      <mesh material={m.gold} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.5, 0.018, 8, 48]} />
      </mesh>
      <mesh material={m.gold} rotation-x={Math.PI / 2} position-y={-0.12}>
        <torusGeometry args={[0.3, 0.012, 8, 40]} />
      </mesh>
      {Array.from({ length: arms }, (_, i) => {
        const a = (i / arms) * Math.PI * 2
        const x = Math.sin(a) * 0.5
        const z = Math.cos(a) * 0.5
        return (
          <group key={i}>
            <mesh material={m.gold} position={[x / 2, 0, z / 2]} rotation={[0, a - Math.PI / 2, Math.PI / 2]}>
              <cylinderGeometry args={[0.01, 0.01, 0.5, 6]} />
            </mesh>
            <mesh material={m.gold} position={[x, 0.04, z]}>
              <cylinderGeometry args={[0.035, 0.025, 0.05, 12]} />
            </mesh>
            <mesh material={m.flame} position={[x, 0.11, z]} scale={[1, 1.6, 1]}>
              <sphereGeometry args={[0.025, 10, 8]} />
            </mesh>
            <mesh material={m.crystal} position={[Math.sin(a + 0.4) * 0.38, -0.2, Math.cos(a + 0.4) * 0.38]}>
              <octahedronGeometry args={[0.03, 0]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
