import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_SESSAO = 'nobru_sessao'

/**
 * Portaria barata.
 *
 * O middleware roda no edge e não fala com o banco, então aqui só olhamos se
 * existe cookie de sessão: quem não tem vai para /entrar sem gastar uma
 * consulta. A validação de verdade (sessão viva, usuário ativo, permissão) é
 * feita em `src/app/(app)/layout.tsx` e em cada Server Action — este arquivo é
 * conveniência de roteamento, nunca a barreira de segurança.
 */
const ROTAS_PUBLICAS = ['/', '/entrar', '/manifest.webmanifest', '/sw.js', '/offline']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const temCookie = Boolean(req.cookies.get(COOKIE_SESSAO)?.value)

  if (pathname === '/entrar' && temCookie) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const publica = ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  if (publica) return NextResponse.next()

  if (!temCookie) {
    const url = new URL('/entrar', req.url)
    if (pathname !== '/dashboard') url.searchParams.set('proximo', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons/|brand/|favicon.ico|.*\.png$|.*\.jpg$|.*\.svg$).*)'],
}
