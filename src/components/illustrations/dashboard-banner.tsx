/**
 * Ilustrasi kecil untuk banner dashboard: dashboard mini + tren naik.
 * Translucent putih untuk ditaruh di atas gradient emerald.
 */
export function DashboardBannerArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="230" cy="80" r="70" fill="white" fillOpacity="0.07" />
      <circle cx="60" cy="30" r="24" fill="white" fillOpacity="0.08" />

      {/* kartu mini 1 */}
      <rect x="150" y="30" width="120" height="60" rx="12" fill="white" fillOpacity="0.95" />
      <rect x="162" y="44" width="40" height="7" rx="3.5" fill="#0f172a" fillOpacity="0.1" />
      <rect x="162" y="60" width="30" height="18" rx="5" fill="#34d399" />
      <rect x="198" y="52" width="30" height="26" rx="5" fill="#059669" />
      <rect x="234" y="44" width="30" height="34" rx="5" fill="#047857" />

      {/* kartu mini 2 */}
      <rect x="120" y="100" width="130" height="46" rx="12" fill="white" fillOpacity="0.9" />
      <circle cx="140" cy="123" r="10" fill="#f59e0b" />
      <path d="M136 123 l3 3 5.5 -5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="158" y="112" width="60" height="7" rx="3.5" fill="#0f172a" fillOpacity="0.12" />
      <rect x="158" y="126" width="40" height="6" rx="3" fill="#0f172a" fillOpacity="0.07" />

      {/* garis tren */}
      <path
        d="M20 120 C 50 110 70 96 96 84 S 140 60 156 50"
        stroke="white"
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path d="M156 50 l-12 2 8 -9 z" fill="white" fillOpacity="0.7" />

      {/* sparkles */}
      <path d="M40 60 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 z" fill="white" fillOpacity="0.8" />
      <path d="M270 110 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" fill="white" fillOpacity="0.6" />
      <circle cx="100" cy="30" r="4" fill="white" fillOpacity="0.5" />
      <circle cx="285" cy="60" r="3" fill="white" fillOpacity="0.5" />
    </svg>
  );
}
