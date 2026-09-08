/**
 * Gera os ícones do PWA a partir da paleta da marca — sem dependência externa.
 *
 * O desenho é o ⭕️: a assinatura verbal que a Nobru usa em todo post desde
 * 2016. Sobre o vermelho do selo, um anel creme. Legível a 48px na tela inicial
 * do celular, o que um lettering de duas linhas não seria.
 *
 * Uso: node scripts/gerar-icones.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const VERMELHO = [0xd2, 0x42, 0x37]
const CREME = [0xff, 0xeb, 0xd6]
const AMBAR = [0xf7, 0xa9, 0x6c]

function crc32(buf) {
  let c
  const tabela = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = tabela[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(tipo, dados) {
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([tamanho, corpo, crc])
}

/** Escreve um PNG RGBA a partir de uma função (x, y) → [r, g, b, a]. */
function escreverPng(caminho, tamanho, pintar) {
  const linhas = []
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 4)
    linha[0] = 0 // filtro "none"
    for (let x = 0; x < tamanho; x++) {
      const [r, g, b, a] = pintar(x, y, tamanho)
      const i = 1 + x * 4
      linha[i] = r
      linha[i + 1] = g
      linha[i + 2] = b
      linha[i + 3] = a
    }
    linhas.push(linha)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(tamanho, 0)
  ihdr.writeUInt32BE(tamanho, 4)
  ihdr[8] = 8 // 8 bits por canal
  ihdr[9] = 6 // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(linhas), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(caminho, png)
  return png.length
}

/** Antialias simples: 3×3 amostras por pixel. */
function suavizar(fn) {
  return (x, y, tamanho) => {
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let sy = 0; sy < 3; sy++) {
      for (let sx = 0; sx < 3; sx++) {
        const [cr, cg, cb, ca] = fn(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3, tamanho)
        r += cr
        g += cg
        b += cb
        a += ca
      }
    }
    return [Math.round(r / 9), Math.round(g / 9), Math.round(b / 9), Math.round(a / 9)]
  }
}

function desenho({ margem, raioCantos }) {
  return suavizar((x, y, t) => {
    const pad = t * margem
    const lado = t - pad * 2
    const cx = t / 2
    const cy = t / 2

    // Distância assinada até um quadrado de cantos arredondados.
    const raio = raioCantos * lado
    const dx = Math.abs(x - cx) - (lado / 2 - raio)
    const dy = Math.abs(y - cy) - (lado / 2 - raio)
    const fora = Math.hypot(Math.max(dx, 0), Math.max(dy, 0))
    const dentroCaixa = Math.min(Math.max(dx, dy), 0)
    if (fora + dentroCaixa - raio > 0) return [0, 0, 0, 0]

    // Anel creme — o ⭕️ que a marca usa em todo post desde 2016.
    const dist = Math.hypot(x - cx, y - cy)
    const raioExterno = lado * 0.28
    const espessura = lado * 0.075
    if (dist <= raioExterno && dist >= raioExterno - espessura) return [...CREME, 255]

    // Traço âmbar embaixo, no lugar da palavra "COFFEE" do selo original.
    const barraY = cy + lado * 0.33
    if (Math.abs(y - barraY) <= lado * 0.028 && Math.abs(x - cx) <= lado * 0.19) return [...AMBAR, 255]

    return [...VERMELHO, 255]
  })
}

mkdirSync('public/icons', { recursive: true })

const alvos = [
  // Ícone comum: margem pequena, o selo ocupa quase tudo.
  { arquivo: 'public/icons/icone-192.png', tamanho: 192, margem: 0.02, raio: 0.24 },
  { arquivo: 'public/icons/icone-512.png', tamanho: 512, margem: 0.02, raio: 0.24 },
  // Maskable: 20% de margem, para o Android recortar sem cortar o anel.
  { arquivo: 'public/icons/icone-maskable-512.png', tamanho: 512, margem: 0.2, raio: 0.5 },
  { arquivo: 'public/icons/favicon-64.png', tamanho: 64, margem: 0.02, raio: 0.24 },
]

for (const alvo of alvos) {
  const bytes = escreverPng(alvo.arquivo, alvo.tamanho, desenho({ margem: alvo.margem, raioCantos: alvo.raio }))
  console.log(`${alvo.arquivo} — ${alvo.tamanho}px, ${(bytes / 1024).toFixed(1)} kB`)
}
