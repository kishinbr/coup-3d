/**
 * Gerador pseudoaleatório com estado explícito (mulberry32).
 * O estado vive dentro do GameState, então a mesma semente reproduz a mesma partida.
 */
export function nextRandom(state: number): [value: number, next: number] {
  let t = (state + 0x6d2b79f5) | 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** Embaralha (Fisher–Yates) e devolve o novo estado do gerador. */
export function shuffle<T>(items: T[], rng: number): [T[], number] {
  const out = items.slice()
  let s = rng
  for (let i = out.length - 1; i > 0; i--) {
    const [r, n] = nextRandom(s)
    s = n
    const j = Math.floor(r * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, s]
}

export function randomInt(max: number, rng: number): [number, number] {
  const [r, n] = nextRandom(rng)
  return [Math.floor(r * max), n]
}
