/**
 * Ilustrasi hero untuk halaman login: scene abstrak pertumbuhan marketing:
 * grafik naik, chat bubbles, roket, sparkles. Warna translucent putih
 * supaya cocok di atas panel gradient emerald.
 */
export function GrowthHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* dekorasi lingkaran latar */}
      <circle cx="240" cy="180" r="150" fill="white" fillOpacity="0.06" />
      <circle cx="240" cy="180" r="110" fill="white" fillOpacity="0.05" />
      <circle cx="392" cy="60" r="40" fill="white" fillOpacity="0.08" />
      <circle cx="70" cy="300" r="30" fill="white" fillOpacity="0.08" />

      {/* kartu grafik utama */}
      <rect x="110" y="90" width="260" height="190" rx="20" fill="white" fillOpacity="0.95" />
      <rect x="132" y="118" width="90" height="10" rx="5" fill="#0f172a" fillOpacity="0.12" />
      <rect x="132" y="136" width="56" height="8" rx="4" fill="#0f172a" fillOpacity="0.07" />

      {/* bar chart */}
      <rect x="140" y="212" width="26" height="48" rx="6" fill="#34d399" />
      <rect x="178" y="192" width="26" height="68" rx="6" fill="#10b981" />
      <rect x="216" y="174" width="26" height="86" rx="6" fill="#059669" />
      <rect x="254" y="150" width="26" height="110" rx="6" fill="#047857" />

      {/* garis tren */}
      <path
        d="M146 200 C 190 178, 225 170, 268 138 S 330 108, 348 96"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <path
        d="M146 198 C 190 176, 225 168, 268 136 S 330 106, 348 94"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* panah di ujung garis */}
      <path d="M348 94 l-14 2 10 -10 z" fill="#f59e0b" />

      {/* chat bubble WA */}
      <rect x="300" y="196" width="120" height="58" rx="14" fill="white" stroke="#059669" strokeOpacity="0.25" />
      <path d="M312 252 l0 12 14 -12 z" fill="white" stroke="#059669" strokeOpacity="0.25" />
      <rect x="314" y="212" width="70" height="7" rx="3.5" fill="#059669" fillOpacity="0.5" />
      <rect x="314" y="226" width="50" height="7" rx="3.5" fill="#059669" fillOpacity="0.25" />

      {/* badge email */}
      <rect x="52" y="118" width="76" height="54" rx="12" fill="#f59e0b" />
      <rect x="64" y="132" width="52" height="6" rx="3" fill="white" fillOpacity="0.9" />
      <rect x="64" y="144" width="34" height="6" rx="3" fill="white" fillOpacity="0.6" />
      <circle cx="116" cy="130" r="9" fill="#dc2626" />
      <path d="M112.5 130 l2.5 2.5 4.5 -4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* roket */}
      <g transform="translate(348 40) rotate(24)">
        <path
          d="M24 0 C 36 12 40 30 40 46 L 8 46 C 8 30 12 12 24 0 Z"
          fill="white"
        />
        <circle cx="24" cy="22" r="7" fill="#10b981" />
        <path d="M8 46 L -2 62 L 10 56 Z" fill="#f59e0b" />
        <path d="M40 46 L 50 62 L 38 56 Z" fill="#f59e0b" />
        <path d="M16 46 C 16 58 24 66 24 72 C 24 66 32 58 32 46 Z" fill="#fbbf24" />
      </g>

      {/* sparkles */}
      <path d="M410 150 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="white" fillOpacity="0.9" />
      <path d="M70 210 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 z" fill="white" fillOpacity="0.7" />
      <path d="M180 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" fill="white" fillOpacity="0.8" />
      <circle cx="430" cy="240" r="4" fill="white" fillOpacity="0.6" />
      <circle cx="96" cy="88" r="4" fill="white" fillOpacity="0.6" />
      <circle cx="300" cy="310" r="5" fill="white" fillOpacity="0.5" />

      {/* titik-titik kecil di bawah kartu */}
      <circle cx="150" cy="306" r="3" fill="white" fillOpacity="0.4" />
      <circle cx="166" cy="306" r="3" fill="white" fillOpacity="0.25" />
      <circle cx="182" cy="306" r="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}
