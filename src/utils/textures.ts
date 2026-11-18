import * as THREE from 'three'
import type { Influence } from '../game/types/card'
import { INFLUENCES } from '../game/constants/influences'
import { PALETTE } from '../game/constants/palette'

/**
 * Texturas procedurais (desenhadas em canvas) para a Fase 1.
 * Evitam baixar imagens e mantêm a direção de arte própria.
 * Na Fase 2, as ilustrações das cartas podem ser trocadas por arte final.
 */

const cache = new Map<string, THREE.Texture>()

function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key)
  if (hit) return hit
  const tex = make()
  cache.set(key, tex)
  return tex
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponível')
  return [c, ctx]
}

function toTexture(c: HTMLCanvasElement, anisotropy = 8): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = anisotropy
  return t
}

/** Ruído fino para dar textura de tecido/papel. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 1) {
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function goldGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, '#8a6630')
  g.addColorStop(0.35, PALETTE.highlight)
  g.addColorStop(0.6, PALETTE.gold)
  g.addColorStop(1, '#7a5726')
  return g
}

/** Coroa estilizada (usada no verso, no Duque e no logotipo da mesa). */
export function drawCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size
  const h = size * 0.62
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, cy + h / 2)
  ctx.lineTo(cx - w / 2, cy - h * 0.1)
  ctx.lineTo(cx - w * 0.28, cy + h * 0.12)
  ctx.lineTo(cx - w * 0.14, cy - h / 2)
  ctx.lineTo(cx, cy + h * 0.05)
  ctx.lineTo(cx + w * 0.14, cy - h / 2)
  ctx.lineTo(cx + w * 0.28, cy + h * 0.12)
  ctx.lineTo(cx + w / 2, cy - h * 0.1)
  ctx.lineTo(cx + w / 2, cy + h / 2)
  ctx.closePath()
  ctx.fill()
  for (const dx of [-0.5, -0.14, 0.14, 0.5]) {
    ctx.beginPath()
    ctx.arc(cx + w * dx, cy + (Math.abs(dx) > 0.3 ? -h * 0.1 : -h / 2) - size * 0.05, size * 0.055, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillRect(cx - w / 2, cy + h / 2 + size * 0.04, w, size * 0.08)
}

/* ---------- Ilustrações das influências (arte própria, simbólica) ---------- */

function drawEmblem(ctx: CanvasRenderingContext2D, id: Influence, cx: number, cy: number, s: number) {
  ctx.save()
  ctx.fillStyle = goldGradient(ctx, cx - s, cy - s, cx + s, cy + s)
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (id) {
    case 'duque': {
      drawCrown(ctx, cx, cy - s * 0.15, s * 1.1)
      // moedas empilhadas
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(cx, cy + s * 0.62 - i * s * 0.1, s * 0.34, s * 0.1, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(40,20,10,0.5)'
        ctx.lineWidth = 3
        ctx.stroke()
      }
      break
    }
    case 'assassino': {
      // adaga vertical
      ctx.beginPath()
      ctx.moveTo(cx, cy - s * 0.95)
      ctx.lineTo(cx + s * 0.13, cy - s * 0.1)
      ctx.lineTo(cx + s * 0.1, cy + s * 0.12)
      ctx.lineTo(cx - s * 0.1, cy + s * 0.12)
      ctx.lineTo(cx - s * 0.13, cy - s * 0.1)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,240,210,0.35)'
      ctx.beginPath()
      ctx.moveTo(cx, cy - s * 0.9)
      ctx.lineTo(cx + s * 0.04, cy + s * 0.1)
      ctx.lineTo(cx, cy + s * 0.1)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = goldGradient(ctx, cx - s, cy, cx + s, cy)
      roundRect(ctx, cx - s * 0.5, cy + s * 0.12, s, s * 0.12, s * 0.05)
      ctx.fill()
      ctx.fillRect(cx - s * 0.06, cy + s * 0.24, s * 0.12, s * 0.5)
      ctx.beginPath()
      ctx.arc(cx, cy + s * 0.8, s * 0.11, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'capitao': {
      // âncora
      ctx.lineWidth = s * 0.13
      ctx.beginPath()
      ctx.arc(cx, cy - s * 0.72, s * 0.15, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx, cy - s * 0.56)
      ctx.lineTo(cx, cy + s * 0.75)
      ctx.moveTo(cx - s * 0.38, cy - s * 0.35)
      ctx.lineTo(cx + s * 0.38, cy - s * 0.35)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy + s * 0.15, s * 0.62, Math.PI * 0.15, Math.PI * 0.85)
      ctx.stroke()
      for (const dir of [-1, 1]) {
        const ex = cx + Math.cos(dir > 0 ? Math.PI * 0.15 : Math.PI * 0.85) * s * 0.62
        const ey = cy + s * 0.15 + Math.sin(Math.PI * 0.15) * s * 0.62
        ctx.beginPath()
        ctx.moveTo(ex - dir * s * 0.02, ey - s * 0.25)
        ctx.lineTo(ex + dir * s * 0.16, ey - s * 0.02)
        ctx.lineTo(ex - dir * s * 0.18, ey + s * 0.04)
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'embaixador': {
      // pergaminho com selo
      roundRect(ctx, cx - s * 0.55, cy - s * 0.7, s * 1.1, s * 1.3, s * 0.08)
      ctx.fill()
      ctx.fillStyle = 'rgba(40,25,10,0.45)'
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(cx - s * 0.38, cy - s * 0.48 + i * s * 0.18, s * (i === 4 ? 0.4 : 0.76), s * 0.045)
      }
      ctx.fillStyle = '#7d1d23'
      ctx.beginPath()
      ctx.arc(cx + s * 0.3, cy + s * 0.55, s * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = goldGradient(ctx, cx - s, cy - s, cx + s, cy + s)
      ctx.beginPath()
      ctx.ellipse(cx, cy - s * 0.72, s * 0.65, s * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx, cy + s * 0.62, s * 0.65, s * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'condessa': {
      // máscara de baile
      ctx.beginPath()
      ctx.moveTo(cx - s * 0.85, cy - s * 0.2)
      ctx.bezierCurveTo(cx - s * 0.6, cy - s * 0.55, cx - s * 0.2, cy - s * 0.4, cx, cy - s * 0.18)
      ctx.bezierCurveTo(cx + s * 0.2, cy - s * 0.4, cx + s * 0.6, cy - s * 0.55, cx + s * 0.85, cy - s * 0.2)
      ctx.bezierCurveTo(cx + s * 0.75, cy + s * 0.25, cx + s * 0.3, cy + s * 0.35, cx, cy + s * 0.1)
      ctx.bezierCurveTo(cx - s * 0.3, cy + s * 0.35, cx - s * 0.75, cy + s * 0.25, cx - s * 0.85, cy - s * 0.2)
      ctx.fill()
      ctx.fillStyle = '#2a1214'
      for (const dir of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + dir * s * 0.38, cy - s * 0.06, s * 0.18, s * 0.09, dir * -0.25, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = goldGradient(ctx, cx - s, cy - s, cx + s, cy + s)
      // haste e plumas
      ctx.lineWidth = s * 0.06
      ctx.beginPath()
      ctx.moveTo(cx + s * 0.75, cy + s * 0.05)
      ctx.lineTo(cx + s * 0.55, cy + s * 0.95)
      ctx.stroke()
      ctx.fillStyle = 'rgba(240,220,190,0.8)'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(cx - s * 0.75 - i * s * 0.05, cy - s * 0.5 - i * s * 0.12, s * 0.07, s * 0.3, -0.5 - i * 0.25, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
  }
  ctx.restore()
}

/** Frente de carta: moldura ornamentada, nome, ilustração e habilidade. */
export function cardFrontTexture(id: Influence): THREE.Texture {
  return cached(`front-${id}`, () => {
    const W = 512
    const H = 716
    const [c, ctx] = canvas(W, H)
    const info = INFLUENCES[id]

    // cartão marfim
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#f2e7d2')
    bg.addColorStop(1, '#dccbab')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    grain(ctx, W, H, 14, 7)

    // molduras
    ctx.strokeStyle = goldGradient(ctx, 0, 0, W, H)
    ctx.lineWidth = 10
    roundRect(ctx, 18, 18, W - 36, H - 36, 22)
    ctx.stroke()
    ctx.lineWidth = 2.5
    roundRect(ctx, 34, 34, W - 68, H - 68, 14)
    ctx.stroke()

    // cantos ornamentais
    ctx.fillStyle = goldGradient(ctx, 0, 0, W, H)
    for (const [x, y] of [
      [34, 34],
      [W - 34, 34],
      [34, H - 34],
      [W - 34, H - 34],
    ]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-11, -11, 22, 22)
      ctx.restore()
    }

    // nome
    ctx.fillStyle = '#2b1a12'
    ctx.font = '700 58px "Cormorant Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(info.name.toUpperCase(), W / 2, 92)
    ctx.fillStyle = goldGradient(ctx, 120, 0, W - 120, 0)
    ctx.fillRect(140, 128, W - 280, 3)

    // painel da ilustração
    const px = 58
    const py = 150
    const pw = W - 116
    const ph = 400
    const art = ctx.createRadialGradient(W / 2, py + ph * 0.45, 20, W / 2, py + ph / 2, ph * 0.75)
    art.addColorStop(0, lighten(info.artColor, 0.35))
    art.addColorStop(1, info.artColor)
    ctx.fillStyle = art
    roundRect(ctx, px, py, pw, ph, 12)
    ctx.fill()
    // raios sutis atrás do emblema
    ctx.save()
    roundRect(ctx, px, py, pw, ph, 12)
    ctx.clip()
    ctx.globalAlpha = 0.09
    ctx.fillStyle = PALETTE.highlight
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(W / 2, py + ph / 2)
      ctx.lineTo(W / 2 + Math.cos(a) * 400, py + ph / 2 + Math.sin(a) * 400)
      ctx.lineTo(W / 2 + Math.cos(a + 0.12) * 400, py + ph / 2 + Math.sin(a + 0.12) * 400)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    ctx.strokeStyle = goldGradient(ctx, px, py, px + pw, py + ph)
    ctx.lineWidth = 4
    roundRect(ctx, px, py, pw, ph, 12)
    ctx.stroke()
    drawEmblem(ctx, id, W / 2, py + ph / 2, 130)

    // habilidade
    ctx.fillStyle = '#4a3324'
    ctx.font = '500 25px "Cormorant Garamond", Georgia, serif'
    wrapText(ctx, info.ability, W / 2, 600, W - 130, 30)
    return toTexture(c)
  })
}

/** Verso padrão: esconde totalmente a identidade da carta. */
export function cardBackTexture(): THREE.Texture {
  return cached('back', () => {
    const W = 512
    const H = 716
    const [c, ctx] = canvas(W, H)
    const bg = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.7)
    bg.addColorStop(0, '#6a2b30')
    bg.addColorStop(1, '#2f1114')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // treliça de losangos
    ctx.save()
    roundRect(ctx, 40, 40, W - 80, H - 80, 14)
    ctx.clip()
    ctx.strokeStyle = 'rgba(226,188,118,0.16)'
    ctx.lineWidth = 2
    for (let i = -H; i < W + H; i += 34) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + H, H)
      ctx.moveTo(i, H)
      ctx.lineTo(i + H, 0)
      ctx.stroke()
    }
    ctx.restore()
    grain(ctx, W, H, 10, 3)

    ctx.strokeStyle = goldGradient(ctx, 0, 0, W, H)
    ctx.lineWidth = 10
    roundRect(ctx, 18, 18, W - 36, H - 36, 22)
    ctx.stroke()
    ctx.lineWidth = 3
    roundRect(ctx, 40, 40, W - 80, H - 80, 14)
    ctx.stroke()

    // medalhão central
    ctx.fillStyle = '#2a0f12'
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 112, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = goldGradient(ctx, W / 2 - 110, 0, W / 2 + 110, 0)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, 96, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = goldGradient(ctx, W / 2 - 80, H / 2 - 80, W / 2 + 80, H / 2 + 80)
    drawCrown(ctx, W / 2, H / 2 - 22, 110)
    ctx.font = '700 46px "Cormorant Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('C', W / 2, H / 2 + 52)
    return toTexture(c)
  })
}

/** Feltro da mesa com logotipo e zonas de jogo. Topo do canvas = lado oposto ao jogador. */
export function feltTexture(): THREE.Texture {
  return cached('felt', () => {
    const S = 2048
    const [c, ctx] = canvas(S, S)
    const bg = ctx.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.52)
    bg.addColorStop(0, '#6b2c30')
    bg.addColorStop(0.7, PALETTE.felt)
    bg.addColorStop(1, '#341416')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, S, S)
    grain(ctx, S, S, 16, 11)

    const gold = 'rgba(197,155,83,'
    // anel perto da borda
    ctx.strokeStyle = gold + '0.55)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(S / 2, S / 2, S * 0.462, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(S / 2, S / 2, S * 0.447, 0, Math.PI * 2)
    ctx.stroke()
    // pontos decorativos no anel
    ctx.fillStyle = gold + '0.5)'
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(S / 2 + Math.cos(a) * S * 0.4545, S / 2 + Math.sin(a) * S * 0.4545, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // logotipo (lado oposto ao jogador)
    const ly = S * 0.37
    ctx.fillStyle = gold + '0.42)'
    drawCrown(ctx, S / 2, ly - 120, 120)
    ctx.font = '700 190px "Cormorant Garamond", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('COUP', S / 2, ly + 40)
    ctx.fillRect(S / 2 - 260, ly + 160, 520, 4)
    ctx.beginPath()
    ctx.moveTo(S / 2, ly + 146)
    ctx.lineTo(S / 2 + 16, ly + 162)
    ctx.lineTo(S / 2, ly + 178)
    ctx.lineTo(S / 2 - 16, ly + 162)
    ctx.closePath()
    ctx.fill()

    // zonas: Corte (esquerda) e Tesouro (direita)
    const zone = (x: number, y: number, w: number, h: number, label: string) => {
      ctx.strokeStyle = gold + '0.32)'
      ctx.lineWidth = 3
      ctx.setLineDash([14, 10])
      roundRect(ctx, x - w / 2, y - h / 2, w, h, 18)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = gold + '0.45)'
      ctx.font = '600 38px "Cormorant Garamond", Georgia, serif'
      ctx.fillText(label, x, y + h / 2 + 34)
    }
    zone(S * 0.38, S * 0.56, 190, 250, 'CORTE')
    zone(S * 0.62, S * 0.56, 330, 250, 'TESOURO')
    return toTexture(c, 16)
  })
}

/** Tapete circular sob a mesa. */
export function rugTexture(): THREE.Texture {
  return cached('rug', () => {
    const S = 1024
    const [c, ctx] = canvas(S, S)
    ctx.fillStyle = '#2a1012'
    ctx.fillRect(0, 0, S, S)
    const ringColors = ['#3b1518', '#5a2a1c', '#2a1012', '#4a1b1e']
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ringColors[i]
      ctx.lineWidth = 26 - i * 4
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * (0.47 - i * 0.03), 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(197,155,83,0.35)'
    ctx.lineWidth = 3
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2
      const r = S * 0.43
      ctx.beginPath()
      ctx.moveTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r)
      ctx.lineTo(S / 2 + Math.cos(a + 0.087) * (r - 30), S / 2 + Math.sin(a + 0.087) * (r - 30))
      ctx.lineTo(S / 2 + Math.cos(a + 0.174) * r, S / 2 + Math.sin(a + 0.174) * r)
      ctx.stroke()
    }
    grain(ctx, S, S, 20, 5)
    return toTexture(c)
  })
}

/** Piso de tábuas escuras. */
export function floorTexture(): THREE.Texture {
  return cached('floor', () => {
    const W = 1024
    const H = 1024
    const [c, ctx] = canvas(W, H)
    const plankH = 64
    let seed = 3
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let y = 0; y < H; y += plankH) {
      let x = -rand() * 300
      while (x < W) {
        const len = 260 + rand() * 260
        const shade = 22 + rand() * 12
        ctx.fillStyle = `rgb(${shade + 14},${shade + 4},${shade - 4})`
        ctx.fillRect(x, y, len, plankH)
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, len, plankH)
        ctx.strokeStyle = 'rgba(255,200,150,0.03)'
        for (let g = 0; g < 6; g++) {
          ctx.beginPath()
          const gy = y + 6 + rand() * (plankH - 12)
          ctx.moveTo(x, gy)
          ctx.bezierCurveTo(x + len * 0.3, gy + 4, x + len * 0.6, gy - 4, x + len, gy)
          ctx.stroke()
        }
        x += len
      }
    }
    grain(ctx, W, H, 10, 9)
    const t = toTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(6, 6)
    return t
  })
}

/** Papel de parede damasco escuro. */
export function wallTexture(): THREE.Texture {
  return cached('wall', () => {
    const S = 512
    const [c, ctx] = canvas(S, S)
    ctx.fillStyle = '#241815'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = 'rgba(197,155,83,0.07)'
    const motif = (x: number, y: number) => {
      ctx.beginPath()
      ctx.moveTo(x, y - 70)
      ctx.bezierCurveTo(x + 50, y - 40, x + 50, y + 40, x, y + 70)
      ctx.bezierCurveTo(x - 50, y + 40, x - 50, y - 40, x, y - 70)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    motif(S / 4, S / 4)
    motif((S * 3) / 4, (S * 3) / 4)
    motif((S * 3) / 4, S / 4 - S / 2 + S)
    motif(S / 4, (S * 3) / 4 + 0)
    grain(ctx, S, S, 8, 4)
    const t = toTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(14, 2)
    return t
  })
}

/* ---------- utilitários ---------- */

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 255) + 255 * amt)
  const g = Math.min(255, ((n >> 8) & 255) + 255 * amt * 0.8)
  const b = Math.min(255, (n & 255) + 255 * amt * 0.6)
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh))
}
