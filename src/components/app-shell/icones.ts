import {
  Archive,
  BadgePercent,
  Banknote,
  BookOpen,
  Boxes,
  CalendarClock,
  ChartNoAxesColumn,
  ClipboardList,
  Coffee,
  CookingPot,
  CreditCard,
  Grid2x2,
  History,
  LayoutDashboard,
  ListOrdered,
  PackageSearch,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'

/**
 * Ícones da navegação, endereçados por nome.
 *
 * A navegação é montada **no servidor** (o layout filtra por permissão) e
 * entregue a componentes de cliente. Um componente React não atravessa essa
 * fronteira: o React só serializa dados, e um ícone do lucide é uma função —
 * daí `Functions cannot be passed directly to Client Components`.
 *
 * Por isso `navegacao.ts` guarda o **nome** do ícone, que é texto, e a
 * resolução para o componente acontece aqui, já do lado do cliente.
 */
export const ICONES = {
  Archive,
  BadgePercent,
  Banknote,
  BookOpen,
  Boxes,
  CalendarClock,
  ChartNoAxesColumn,
  ClipboardList,
  Coffee,
  CookingPot,
  CreditCard,
  Grid2x2,
  History,
  LayoutDashboard,
  ListOrdered,
  PackageSearch,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Wallet,
} as const satisfies Record<string, React.ComponentType<{ className?: string }>>

export type NomeIcone = keyof typeof ICONES
