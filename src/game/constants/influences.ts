import type { Influence, InfluenceInfo } from '../types/card'

export const INFLUENCES: Record<Influence, InfluenceInfo> = {
  duque: { id: 'duque', name: 'Duque', ability: 'Taxar: +3 moedas · Bloqueia Ajuda Externa', artColor: '#5b2333' },
  assassino: { id: 'assassino', name: 'Assassino', ability: 'Paga 3 moedas para assassinar', artColor: '#2a2526' },
  capitao: { id: 'capitao', name: 'Capitão', ability: 'Rouba 2 moedas · Bloqueia roubos', artColor: '#1f2b45' },
  embaixador: { id: 'embaixador', name: 'Embaixador', ability: 'Troca cartas · Bloqueia roubos', artColor: '#22392f' },
  condessa: { id: 'condessa', name: 'Condessa', ability: 'Bloqueia assassinatos', artColor: '#6b1f24' },
}

/** 5 cópias de cada influência = 25 cartas (GDD §2.2). */
export const DECK_SIZE = 25
export const COPIES_PER_INFLUENCE = 5
