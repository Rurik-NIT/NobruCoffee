/**
 * Ilustrações do site — SVG desenhado à mão, sem foto e sem biblioteca.
 *
 * A loja não tem banco de imagens próprio, e as fotos que existem no Google e
 * no Instagram são de terceiros. Em vez de improvisar com foto de banco, o site
 * inteiro é ilustrado: dá coerência visual, carrega rápido e não depende de
 * direito de uso de ninguém.
 *
 * A paleta vem do logo (ver docs/referencias/NOBRU_COFFEE_BRIEF.md § 6.2) e as
 * cores são literais aqui de propósito: é arte fixa, não componente de UI que
 * precisa acompanhar tema.
 */

const VERMELHO = '#d24237'
const VERMELHO_ESCURO = '#8e2a23'
const CREME = '#ffebd6'
const AMBAR = '#f7a96c'
const MADEIRA = '#6b4a2f'
const MADEIRA_CLARA = '#8b6440'
const TINTA = '#1c1a19'
const FOLHA = '#2e7d5b'

/**
 * Donut de frente, com cobertura, brilho e granulado.
 *
 * `granulado` fixo por índice em vez de aleatório: aleatório no servidor e no
 * cliente gera marcação diferente e o React reclama de hidratação.
 */
export function Donut({ className, cobertura = VERMELHO }: { className?: string; cobertura?: string }) {
  const granulado = [
    { x: 100, y: 44, r: -20 }, { x: 143, y: 63, r: 35 }, { x: 158, y: 108, r: -10 },
    { x: 138, y: 149, r: 60 }, { x: 96, y: 165, r: 15 }, { x: 57, y: 146, r: -45 },
    { x: 42, y: 104, r: 25 }, { x: 60, y: 62, r: -60 }, { x: 122, y: 40, r: 10 },
    { x: 168, y: 84, r: -30 }, { x: 118, y: 163, r: 40 }, { x: 40, y: 132, r: -15 },
  ]
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Donut com cobertura e granulado">
      <circle cx="100" cy="104" r="86" fill={MADEIRA} opacity="0.35" />
      <circle cx="100" cy="100" r="86" fill="#c98a52" />
      <circle cx="100" cy="100" r="86" fill="url(#massa)" />
      {/* Cobertura com borda ondulada — o pingo escorrido do glacê. */}
      <path
        d="M100 16c26 0 40 10 55 16s28 16 28 38c0 18-8 26-6 40 3 16-14 22-26 30-13 9-22 22-40 22-17 0-30-9-45-16-16-7-32-10-38-26-6-15 4-26 2-42-2-17 8-30 24-40 15-9 24-22 46-22z"
        fill={cobertura}
      />
      <path
        d="M100 16c26 0 40 10 55 16s28 16 28 38c0 18-8 26-6 40"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {granulado.map((g, i) => (
        <rect
          key={i}
          x={g.x}
          y={g.y}
          width="13"
          height="5"
          rx="2.5"
          fill={i % 3 === 0 ? CREME : i % 3 === 1 ? AMBAR : '#ffffff'}
          transform={`rotate(${g.r} ${g.x + 6} ${g.y + 2})`}
        />
      ))}
      <circle cx="100" cy="100" r="27" fill={TINTA} />
      <circle cx="100" cy="100" r="27" fill="url(#furo)" />
      <defs>
        <radialGradient id="massa" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e0a76d" />
          <stop offset="1" stopColor="#b5763f" />
        </radialGradient>
        <radialGradient id="furo" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#2b2624" />
          <stop offset="1" stopColor="#151312" />
        </radialGradient>
      </defs>
    </svg>
  )
}

/** Xícara com vapor. O vapor anima por CSS (`.vapor`), não por SMIL. */
export function Xicara({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 170" className={className} role="img" aria-label="Xícara de café com vapor">
      <g className="vapor" stroke={CREME} strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M62 46c0-10 8-12 8-22s-8-12-8-22" />
        <path d="M84 42c0-9 8-11 8-20s-8-11-8-20" style={{ animationDelay: '-1.1s' }} />
        <path d="M106 48c0-8 7-10 7-18s-7-10-7-18" style={{ animationDelay: '-2.2s' }} />
      </g>
      <path d="M126 78h10a20 20 0 0 1 0 40h-12" fill="none" stroke={CREME} strokeWidth="9" strokeLinecap="round" />
      <path d="M24 68h104v34a48 48 0 0 1-48 48h-8a48 48 0 0 1-48-48z" fill={CREME} />
      <path d="M24 68h104v12H24z" fill={AMBAR} opacity="0.55" />
      <ellipse cx="76" cy="70" rx="52" ry="9" fill="#6f4526" />
      <ellipse cx="76" cy="69" rx="45" ry="7" fill="#3d2415" />
      <rect x="14" y="150" width="124" height="11" rx="5.5" fill={MADEIRA} />
    </svg>
  )
}

/**
 * A fachada, do jeito que ela é: frente escura com madeira, toldo vermelho,
 * lousa de menu escrita a giz, buganvília na entrada e a vitrine acesa virada
 * para a Av. São João.
 */
export function Fachada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 380"
      className={className}
      role="img"
      aria-label="Ilustração da fachada da Nobru Coffee: frente escura com madeira, toldo vermelho, lousa de menu e plantas na entrada"
    >
      <rect x="0" y="0" width="520" height="380" rx="18" fill="#15120f" />
      <rect x="24" y="30" width="472" height="320" rx="10" fill="#221c18" />

      {/* Vitrine acesa */}
      <rect x="52" y="140" width="252" height="150" rx="6" fill="#3a2a1c" />
      <rect x="60" y="148" width="236" height="134" rx="4" fill="url(#luzVitrine)" />
      {/* Prateleiras com produto */}
      {[178, 216, 254].map((y, linha) => (
        <g key={y}>
          <rect x="66" y={y + 16} width="224" height="4" rx="2" fill={MADEIRA} />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={86 + i * 46}
              cy={y + 8}
              r={linha === 1 ? 11 : 9}
              fill={i % 3 === 0 ? VERMELHO : i % 3 === 1 ? AMBAR : CREME}
              opacity="0.92"
            />
          ))}
        </g>
      ))}

      {/* Porta */}
      <rect x="330" y="130" width="130" height="160" rx="6" fill="#2c231d" />
      <rect x="340" y="142" width="110" height="120" rx="4" fill="url(#luzPorta)" />
      <circle cx="444" cy="212" r="4" fill={AMBAR} />

      {/* Toldo */}
      <path d="M34 108h452l-16 34H50z" fill={VERMELHO} />
      <path d="M34 108h452l-6 12H40z" fill={VERMELHO_ESCURO} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${52 + i * 56} 142l14-34h${i % 2 ? 0.01 : 0.01}z`} fill={CREME} opacity="0.12" />
      ))}

      {/* Letreiro */}
      <rect x="150" y="52" width="220" height="46" rx="8" fill={VERMELHO} />
      <text
        x="260"
        y="83"
        textAnchor="middle"
        fill={CREME}
        fontSize="27"
        fontWeight="800"
        letterSpacing="1"
        fontFamily="var(--font-display), sans-serif"
      >
        NOBRU
      </text>

      {/* Lousa de menu */}
      <rect x="60" y="300" width="86" height="66" rx="5" fill={MADEIRA} />
      <rect x="66" y="306" width="74" height="54" rx="3" fill="#20262a" />
      {[314, 324, 334, 344].map((y, i) => (
        <rect key={y} x="73" y={y} width={i === 0 ? 56 : i === 3 ? 34 : 46} height="3.5" rx="1.75" fill={CREME} opacity="0.62" />
      ))}

      {/* Buganvília e plantas */}
      <g>
        <rect x="466" y="300" width="34" height="40" rx="5" fill={MADEIRA_CLARA} />
        <path d="M483 300c-14-14-26-8-30-26 16-4 24 6 30 20 6-16 16-26 32-20-6 18-18 12-32 26z" fill={FOLHA} />
        <circle cx="470" cy="272" r="5" fill={VERMELHO} opacity="0.85" />
        <circle cx="496" cy="266" r="4.5" fill={VERMELHO} opacity="0.7" />
        <circle cx="484" cy="256" r="4" fill="#e0708a" opacity="0.8" />
      </g>
      <g>
        <rect x="20" y="306" width="30" height="34" rx="5" fill={MADEIRA_CLARA} />
        <path d="M35 306c-12-10-22-6-25-22 14-3 20 5 25 16 5-13 14-22 27-16-5 15-15 10-27 22z" fill={FOLHA} />
      </g>

      {/* Calçada */}
      <rect x="0" y="346" width="520" height="34" rx="0" fill="#100e0c" />
      <rect x="0" y="346" width="520" height="3" fill={MADEIRA} opacity="0.4" />

      <defs>
        <linearGradient id="luzVitrine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3524" />
          <stop offset="1" stopColor="#2a1f16" />
        </linearGradient>
        <linearGradient id="luzPorta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a4128" />
          <stop offset="1" stopColor="#2e2318" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** O ⭕️ da marca, desenhado — usado como marcador de seção. */
export function Circulo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke={VERMELHO} strokeWidth="4" />
    </svg>
  )
}
