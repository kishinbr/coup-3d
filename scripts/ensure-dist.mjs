// O servidor local (wrangler dev) serve a pasta dist/. Ela precisa existir, mesmo vazia.
import { mkdirSync } from 'node:fs'
mkdirSync(new URL('../dist', import.meta.url), { recursive: true })
