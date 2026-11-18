import { useMemo } from 'react'
import * as THREE from 'three'
import { TABLE } from '../../game/constants/table'
import { MATERIAL_COLORS, PALETTE } from '../../game/constants/palette'
import { feltTexture } from '../../utils/textures'

/** Mesa redonda para até 6 jogadores: feltro vermelho, borda de madeira e frisos dourados. */
export function PokerTable() {
  const { felt, wood, woodDark, gold } = useMemo(
    () => ({
      felt: new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.95, metalness: 0, color: '#c9a6a2' }),
      wood: new THREE.MeshStandardMaterial({ color: MATERIAL_COLORS.woodPolished, roughness: 0.32, metalness: 0.05 }),
      woodDark: new THREE.MeshStandardMaterial({ color: MATERIAL_COLORS.woodDark, roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.3 }),
    }),
    [],
  )
  const y = TABLE.surfaceY
  const R = TABLE.feltRadius

  return (
    <group>
      {/* feltro */}
      <mesh material={felt} rotation-x={-Math.PI / 2} position-y={y} receiveShadow>
        <circleGeometry args={[R + 0.02, 96]} />
      </mesh>
      {/* borda acolchoada de madeira */}
      <mesh material={wood} position-y={y + 0.012} rotation-x={Math.PI / 2} scale={[1, 1, 0.55]} castShadow receiveShadow>
        <torusGeometry args={[R + 0.075, 0.085, 20, 128]} />
      </mesh>
      {/* friso dourado interno */}
      <mesh material={gold} position-y={y + 0.006} rotation-x={Math.PI / 2}>
        <torusGeometry args={[R - 0.005, 0.007, 8, 128]} />
      </mesh>
      {/* friso dourado externo */}
      <mesh material={gold} position-y={y - 0.03} rotation-x={Math.PI / 2}>
        <torusGeometry args={[R + 0.155, 0.008, 8, 128]} />
      </mesh>
      {/* saia da mesa */}
      <mesh material={woodDark} position-y={y - 0.09} castShadow receiveShadow>
        <cylinderGeometry args={[R + 0.15, R + 0.1, 0.13, 96, 1, true]} />
      </mesh>
      <mesh material={woodDark} position-y={y - 0.155} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[R + 0.1, 64]} />
      </mesh>
      {/* pedestal */}
      <mesh material={woodDark} position-y={0.35} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.5, 32]} />
      </mesh>
      <mesh material={wood} position-y={0.06} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.12, 48]} />
      </mesh>
      <mesh material={gold} position-y={0.6} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.225, 0.012, 8, 48]} />
      </mesh>
    </group>
  )
}
