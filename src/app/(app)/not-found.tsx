import Link from 'next/link'
import { Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'

export default function NaoEncontrado() {
  return (
    <div className="rounded-card border border-hairline bg-paper-raised">
      <EmptyState
        icone={Compass}
        titulo="Este registro não existe mais"
        descricao="Ele pode ter sido excluído, ou o link está errado."
        acao={
          <Button asChild>
            <Link href="/dashboard">Voltar ao painel</Link>
          </Button>
        }
      />
    </div>
  )
}
