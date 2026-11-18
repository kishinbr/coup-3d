import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { MATERIAL_COLORS, PALETTE } from '../../game/constants/palette'

const shared = {
  wood: new THREE.MeshStandardMaterial({ color: MATERIAL_COLORS.woodPolished, roughness: 0.35 }),
  velvet: new THREE.MeshStandardMaterial({ color: '#5a1a20', roughness: 0.8 }),
  gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.3 }),
}

/** Cadeira de espaldar alto com estofado de veludo. Frente voltada para +Z. */
export function Chair(props: ThreeElements['group']) {
  const backShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.27, 0)
    s.lineTo(0.27, 0)
    s.lineTo(0.27, 0.62)
    s.quadraticCurveTo(0.27, 0.78, 0, 0.82)
    s.quadraticCurveTo(-0.27, 0.78, -0.27, 0.62)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3 })
  }, [])
  const panelShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.21, 0.06)
    s.lineTo(0.21, 0.06)
    s.lineTo(0.21, 0.6)
    s.quadraticCurveTo(0.21, 0.72, 0, 0.75)
    s.quadraticCurveTo(-0.21, 0.72, -0.21, 0.6)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4 })
  }, [])

  return (
    <group {...props}>
      {/* assento */}
      <mesh material={shared.wood} position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[0.56, 0.06, 0.52]} />
      </mesh>
      <mesh material={shared.velvet} position={[0, 0.49, 0.01]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.46]} />
      </mesh>
      {/* pernas */}
      {[
        [-0.24, 0.22],
        [0.24, 0.22],
        [-0.24, -0.22],
        [0.24, -0.22],
      ].map(([x, z], i) => (
        <mesh key={i} material={shared.wood} position={[x, 0.21, z]}>
          <cylinderGeometry args={[0.022, 0.016, 0.42, 8]} />
        </mesh>
      ))}
      {/* espaldar */}
      <group position={[0, 0.5, -0.27]} rotation-x={-0.08}>
        <mesh geometry={backShape} material={shared.wood} position-z={-0.03} castShadow />
        <mesh geometry={panelShape} material={shared.velvet} position-z={0.02} />
        <mesh material={shared.gold} position={[0, 0.86, 0]}>
          <sphereGeometry args={[0.03, 12, 10]} />
        </mesh>
      </group>
    </group>
  )
}
