/** As cinco influências da edição base (GDD §2). Nenhuma outra deve existir. */
export type Influence = 'duque' | 'assassino' | 'capitao' | 'embaixador' | 'condessa'

export interface InfluenceInfo {
  id: Influence
  name: string
  /** Texto curto exibido na carta. */
  ability: string
  /** Cor de fundo da ilustração da carta. */
  artColor: string
}
