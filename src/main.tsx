import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import './index.css'
import App from './App'

// As texturas das cartas e do feltro são desenhadas em canvas com estas fontes,
// então elas precisam estar carregadas antes de a cena ser criada.
const fonts = [
  '500 32px "Cormorant Garamond"',
  '600 32px "Cormorant Garamond"',
  '700 32px "Cormorant Garamond"',
  '500 16px "Manrope"',
]

Promise.allSettled(fonts.map((f) => document.fonts.load(f))).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
