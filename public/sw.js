/**
 * Service worker do Nobru Coffee.
 *
 * ESCOPO HONESTO DO OFFLINE (ver docs/ARQUITETURA.md § PWA):
 *
 *  ✅ A casca do app fica no aparelho: abrir o ícone sem rede mostra uma tela
 *     explicando a situação, em vez do dinossauro do navegador.
 *  ✅ Assets estáticos (JS, CSS, fontes, ícones) vêm do cache — o app abre
 *     rápido mesmo em 3G ruim.
 *  ❌ NÃO existe fila de vendas offline. Nenhuma venda é gravada sem rede, e o
 *     PDV avisa isso na barra superior. Uma fila offline num sistema com
 *     estoque, caixa e fidelidade exigiria resolução de conflito de saldo, e
 *     entregar isso pela metade seria pior do que não ter.
 */
const VERSAO = 'nobru-v1'
const CACHE_ESTATICO = `${VERSAO}-estatico`
const CACHE_PAGINAS = `${VERSAO}-paginas`

const ESSENCIAIS = ['/offline', '/manifest.webmanifest', '/icons/icone-192.png', '/icons/icone-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll(ESSENCIAIS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => !c.startsWith(VERSAO)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const req = evento.request

  // Só GET entra em cache. POST é Server Action: sempre rede, nunca cache.
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navegação: rede primeiro (os dados mudam o tempo todo), com a página
  // offline como último recurso.
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE_PAGINAS).then((cache) => cache.put(req, copia))
          return resposta
        })
        .catch(async () => (await caches.match(req)) ?? (await caches.match('/offline')) ?? Response.error()),
    )
    return
  }

  // Build estático do Next: imutável, cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(
      caches.match(req).then(
        (cacheada) =>
          cacheada ??
          fetch(req).then((resposta) => {
            const copia = resposta.clone()
            caches.open(CACHE_ESTATICO).then((cache) => cache.put(req, copia))
            return resposta
          }),
      ),
    )
    return
  }

  // Demais GETs: rede primeiro, cache como rede de segurança.
  evento.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r ?? Response.error())))
})
