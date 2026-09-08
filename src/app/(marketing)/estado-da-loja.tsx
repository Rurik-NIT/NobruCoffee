'use client'

import * as React from 'react'

import { HORARIOS } from './conteudo'

/**
 * Diz se a loja está aberta agora.
 *
 * O fuso é fixo em São Paulo, não o do visitante: a pergunta é "a loja está
 * aberta?", e a resposta não muda porque alguém abriu o site viajando.
 *
 * Renderiza o horário estático no servidor e troca pelo estado ao montar —
 * assim a página em repouso já diz algo útil, e não há divergência de
 * hidratação por causa de relógio.
 */
type Estado = { aberta: boolean; texto: string }

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function agora() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]))
  return { dia: DIAS[p.weekday] ?? 0, minuto: Number(p.hour) * 60 + Number(p.minute) }
}

function calcular(): Estado {
  const { dia, minuto } = agora()
  const hoje = HORARIOS.find((h) => h.dia === dia)

  if (hoje?.abre && hoje.fecha) {
    const abre = minutos(hoje.abre)
    const fecha = minutos(hoje.fecha)
    if (minuto >= abre && minuto < fecha) {
      const faltam = fecha - minuto
      return {
        aberta: true,
        texto: faltam <= 60 ? `Aberta · fecha em ${faltam} min` : `Aberta agora · até ${hoje.fecha.replace(':', 'h')}`,
      }
    }
    if (minuto < abre) return { aberta: false, texto: `Abre hoje às ${hoje.abre.replace(':', 'h')}` }
  }

  // Procura o próximo dia com expediente.
  for (let i = 1; i <= 7; i++) {
    const proximo = HORARIOS.find((h) => h.dia === (dia + i) % 7)
    if (proximo?.abre) {
      const quando = i === 1 ? 'amanhã' : proximo.nome.toLowerCase()
      return { aberta: false, texto: `Fechada · abre ${quando} às ${proximo.abre.replace(':', 'h')}` }
    }
  }
  return { aberta: false, texto: 'Fechada' }
}

export function EstadoDaLoja({ className }: { className?: string }) {
  const [estado, setEstado] = React.useState<Estado | null>(null)

  React.useEffect(() => {
    setEstado(calcular())
    const id = setInterval(() => setEstado(calcular()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={className}>
      <span
        aria-hidden="true"
        className={
          estado?.aberta
            ? 'inline-block size-2 rounded-full bg-leaf shadow-[0_0_0_3px_rgba(46,125,91,0.25)]'
            : 'inline-block size-2 rounded-full bg-amber-nobru/70'
        }
      />
      {estado ? estado.texto : 'Terça a sexta, 10h às 19h30'}
    </span>
  )
}
