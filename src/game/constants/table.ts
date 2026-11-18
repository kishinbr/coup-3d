/** Medidas da mesa e dos assentos, em metros. */
export const TABLE = {
  feltRadius: 1.3,
  rimRadius: 1.4,
  surfaceY: 0.78,
  seatRadius: 1.88,
  seatCount: 6,
} as const

/** Ângulo do assento: o 0 fica de frente para a câmera (+Z), os demais seguem no sentido horário visto de cima. */
export function seatAngle(seat: number): number {
  return (seat / TABLE.seatCount) * Math.PI * 2
}

/** Ponto no plano XZ a uma distância do centro, na direção do assento. */
export function seatPoint(seat: number, radius: number): [number, number] {
  const a = seatAngle(seat)
  return [Math.sin(a) * radius, Math.cos(a) * radius]
}

/** Altura dos olhos do jogador local sentado. */
export const EYE_HEIGHT = 1.24
