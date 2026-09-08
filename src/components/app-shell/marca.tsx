import { cn } from '@/lib/utils'

/**
 * Selo da marca.
 *
 * Reconstruído em tipografia porque o único arquivo público disponível é o
 * avatar do Instagram em 150×150 (ver docs/referencias/NOBRU_COFFEE_BRIEF.md
 * § 6.1 e docs/PENDENCIAS-DO-CLIENTE.md). A estrutura é fiel ao original:
 * quadrado arredondado vermelho, "No / bru" empilhado em creme com letras
 * levemente rotacionadas, e "COFFEE" em âmbar com entreletramento largo.
 *
 * Trocar por `<Image src="/brand/logo.svg">` quando o vetor chegar.
 */
export function SeloNobru({ className, tamanho = 40 }: { className?: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 flex-col items-center justify-center rounded-[26%] bg-nobru-500 leading-none select-none',
        className,
      )}
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className="font-display font-black text-cream"
        style={{ fontSize: tamanho * 0.3, marginBottom: -tamanho * 0.06, transform: 'rotate(-3deg)' }}
      >
        No
      </span>
      <span
        className="font-display font-black text-cream"
        style={{ fontSize: tamanho * 0.3, transform: 'rotate(2deg)' }}
      >
        bru
      </span>
      <span
        className="font-display font-bold"
        style={{
          fontSize: tamanho * 0.13,
          letterSpacing: tamanho * 0.032,
          marginTop: tamanho * 0.06,
          marginLeft: tamanho * 0.03,
          color: 'var(--color-amber-nobru)',
        }}
      >
        COFFEE
      </span>
    </span>
  )
}

/** Assinatura horizontal: selo + nome. Usada no topo da sidebar e na landing. */
export function MarcaNobru({
  className,
  tom = 'escuro',
  tamanho = 36,
  subtitulo,
}: {
  className?: string
  /** 'escuro' = sobre fundo escuro (texto creme). 'claro' = sobre papel. */
  tom?: 'escuro' | 'claro'
  tamanho?: number
  subtitulo?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <SeloNobru tamanho={tamanho} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            'font-display text-[15px] font-extrabold tracking-tight',
            tom === 'escuro' ? 'text-cream' : 'text-body',
          )}
        >
          Nobru Coffee
        </span>
        <span className={cn('truncate text-[11px]', tom === 'escuro' ? 'text-on-dark-muted' : 'text-body-muted')}>
          {subtitulo ?? 'Coffee e Donuts'}
        </span>
      </span>
    </span>
  )
}

/** O ⭕️ é a assinatura verbal da marca — abre todos os posts desde 2016. */
export function CirculoNobru({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2.5 rounded-full border-[3px] border-nobru-500', className)}
    />
  )
}
