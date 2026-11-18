/**
 * Plaquinhas dos jogadores: são elementos HTML comuns no HUD, e a cena 3D
 * só atualiza a posição deles a cada quadro (sem re-renderizar o React).
 * Assim elas ficam acima da cena, abaixo dos menus, e nunca somem.
 */
const elements = new Map<string, HTMLElement>()

export function registerTag(id: string, el: HTMLElement | null) {
  if (el) elements.set(id, el)
  else elements.delete(id)
}

export function tagElement(id: string): HTMLElement | undefined {
  return elements.get(id)
}
