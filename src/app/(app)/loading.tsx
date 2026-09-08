import { SkeletonCards, SkeletonTabela } from '@/components/ui/states'

/** Esqueleto padrão do sistema: mesma altura do conteúdo real, sem "salto". */
export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="mb-5">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton mt-2 h-4 w-80" />
      </div>
      <SkeletonCards />
      <div className="overflow-hidden rounded-card border border-hairline bg-paper-raised">
        <SkeletonTabela linhas={8} />
      </div>
    </div>
  )
}
