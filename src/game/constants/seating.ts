/**
 * Onde cada jogador senta, do ponto de vista de quem está olhando.
 * Você está sempre no assento 0 (de frente para a câmera); os demais seguem
 * a ordem dos turnos, distribuídos de forma simétrica na mesa de 6 lugares.
 */

/** Assentos usados conforme a quantidade de adversários. */
export const SEAT_LAYOUT: Record<number, number[]> = {
  1: [3],
  2: [2, 4],
  3: [2, 3, 4],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
}

export function seatsFor(playerIds: string[], viewerId: string): Record<string, number> {
  const n = playerIds.length
  const v = Math.max(0, playerIds.indexOf(viewerId))
  const layout = SEAT_LAYOUT[n - 1] ?? []
  const seats: Record<string, number> = { [playerIds[v]]: 0 }
  for (let k = 1; k < n; k++) seats[playerIds[(v + k) % n]] = layout[k - 1]
  return seats
}

/** Visual provisório de cada assento (os bots usam sempre o próprio visual). */
const SEAT_LOOKS: Record<number, string> = { 1: 'helena', 2: 'rafael', 3: 'marina', 4: 'lucas', 5: 'otavio' }
const ALL_LOOKS = ['marina', 'lucas', 'rafael', 'helena', 'otavio']

/** Ids de bot: "marina" (modo local) ou "bot_marina" (online). */
export function botLook(id: string): string | null {
  const key = id.replace(/^bot_/, '')
  return ALL_LOOKS.includes(key) ? key : null
}

/** Escolhe um visual para cada adversário, sem repetir. */
export function looksFor(playerIds: string[], seats: Record<string, number>, viewerId: string): Record<string, string | null> {
  const looks: Record<string, string | null> = { [viewerId]: null }
  const used = new Set<string>()
  for (const id of playerIds) {
    const own = botLook(id)
    if (id !== viewerId && own) {
      looks[id] = own
      used.add(own)
    }
  }
  for (const id of playerIds) {
    if (id === viewerId || looks[id]) continue
    const preferred = SEAT_LOOKS[seats[id]]
    const pick = preferred && !used.has(preferred) ? preferred : ALL_LOOKS.find((l) => !used.has(l))
    looks[id] = pick ?? null
    if (pick) used.add(pick)
  }
  return looks
}
