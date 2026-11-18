import type { Influence } from '../game/types/card'
import { cardBackTexture, cardFrontTexture } from './textures'

/** Imagem (data URL) das cartas para usar na interface 2D, a partir das mesmas texturas da cena. */
const cache = new Map<string, string>()

export function cardImageUrl(influence: Influence | null): string {
  const key = influence ?? 'back'
  const hit = cache.get(key)
  if (hit) return hit
  const tex = influence ? cardFrontTexture(influence) : cardBackTexture()
  const url = (tex.image as HTMLCanvasElement).toDataURL('image/png')
  cache.set(key, url)
  return url
}
