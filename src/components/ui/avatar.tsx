'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn } from '@/lib/utils'
import { initials } from '@/lib/utils'

export function Avatar({
  nome,
  src,
  className,
}: {
  nome: string
  src?: string | null
  className?: string
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex size-9 shrink-0 overflow-hidden rounded-full border border-hairline-strong',
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={nome} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center bg-nobru-500 text-xs font-bold text-white">
        {initials(nome)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
