import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TABLE, seatPoint } from '../../game/constants/table'
import { tagElement } from '../interface/tagLayer'
import { AVATAR_TAG_HEIGHT } from './PlayerAvatar'

/** Projeta a posição acima da cabeça de cada adversário na tela e move a plaquinha correspondente. */
export function TagProjector({ seats }: { seats: Record<string, number> }) {
  const anchors = useMemo(
    () =>
      Object.entries(seats)
        .filter(([, seat]) => seat !== 0)
        .map(([id, seat]) => {
          const [x, z] = seatPoint(seat, TABLE.seatRadius)
          return { id, pos: new THREE.Vector3(x, AVATAR_TAG_HEIGHT, z) }
        }),
    [seats],
  )
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = tagElement(a.id)
      if (!el) continue
      v.copy(a.pos).project(camera)
      const visible = v.z < 1 && Math.abs(v.x) < 1.3 && Math.abs(v.y) < 1.3
      el.style.visibility = visible ? 'visible' : 'hidden'
      if (visible) {
        const x = (v.x * 0.5 + 0.5) * size.width
        const y = (-v.y * 0.5 + 0.5) * size.height
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      }
    }
  })
  return null
}
