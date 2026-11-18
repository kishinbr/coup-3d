/** Linha do registro da partida exibido no HUD. */
export interface LogEntry {
  id: string
  text: string
  kind: 'coins' | 'challenge' | 'action' | 'info'
}
