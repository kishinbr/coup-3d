import { Environment, Lightformer } from '@react-three/drei'

/**
 * Iluminação quente e dramática com poucas luzes dinâmicas (GDD §6.7, §13.3):
 * uma luz de destaque sobre a mesa (única com sombra), o lustre, uma luz de recorte
 * e um mapa de ambiente procedural para os reflexos do dourado (sem downloads).
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.22} color="#ffd9b0" />
      <hemisphereLight args={['#6b4330', '#0d0807', 0.45]} />

      {/* foco principal sobre a mesa */}
      <spotLight
        position={[0, 4.3, 0.4]}
        angle={0.62}
        penumbra={0.85}
        intensity={38}
        decay={2}
        distance={12}
        color="#ffcf98"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* calor do lustre */}
      <pointLight position={[0, 2.85, 0]} intensity={7} distance={9} decay={2} color="#ffb06a" />
      {/* recorte por trás dos adversários */}
      <directionalLight position={[0, 3, -7]} intensity={0.9} color="#ff9e62" />
      {/* arandelas nas paredes do fundo: dão profundidade ao salão */}
      <pointLight position={[-3.6, 2.2, -5.6]} intensity={9} distance={7} decay={2} color="#ff9a50" />
      <pointLight position={[3.8, 2.2, -5.4]} intensity={9} distance={7} decay={2} color="#ff9a50" />
      {/* preenchimento suave vindo do jogador (rostos dos adversários) */}
      <pointLight position={[0, 1.7, 2.4]} intensity={2.2} distance={6} decay={2} color="#ffd2a6" />

      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#120c0a']} />
        <Lightformer form="ring" intensity={3} color="#ffcc88" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={3} />
        <Lightformer form="rect" intensity={1.2} color="#ff9a55" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#c0603a" position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="circle" intensity={2} color="#ffe2b0" position={[0, 2, 6]} scale={1.5} />
      </Environment>
    </>
  )
}
