import { useEffect, useState } from 'react'

/**
 * Relógio para contagens regressivas. Só "anda" enquanto `active` for verdadeiro,
 * e atualiza logo ao ser ativado, para nunca exibir um valor velho.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const first = setTimeout(() => setNow(Date.now()), 0)
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [active, intervalMs])
  return now
}
