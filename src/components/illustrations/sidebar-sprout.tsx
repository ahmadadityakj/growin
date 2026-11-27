/**
 * Ilustrasi "kebun kecil" untuk dasar sidebar: beberapa sprout tumbuh
 * dari tepi bawah. Pakai currentColor — atur warna lewat class text-*.
 */
export function SidebarSprout({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      {/* sprout kiri — pendek */}
      <path d="M44 84 C 42 66 46 56 44 42" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fillOpacity="0" strokeOpacity="0.9" />
      <ellipse cx="37" cy="39" rx="9" ry="4" transform="rotate(-38 37 39)" fill="currentColor" fillOpacity="0.9" />
      <ellipse cx="51" cy="36" rx="7.5" ry="3.4" transform="rotate(24 51 36)" fill="currentColor" fillOpacity="0.7" />

      {/* sprout tengah — paling tinggi */}
      <path d="M112 84 C 110 58 117 40 112 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fillOpacity="0" />
      <ellipse cx="104" cy="15" rx="12" ry="5.4" transform="rotate(-34 104 15)" fill="currentColor" />
      <ellipse cx="121" cy="12" rx="10.5" ry="4.8" transform="rotate(26 121 12)" fill="currentColor" fillOpacity="0.8" />
      <circle cx="112" cy="30" r="2" fill="currentColor" fillOpacity="0.6" />

      {/* sprout kanan — sedang */}
      <path d="M182 84 C 181 66 186 56 183 46" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fillOpacity="0" strokeOpacity="0.85" />
      <ellipse cx="176" cy="43" rx="8" ry="3.6" transform="rotate(-40 176 43)" fill="currentColor" fillOpacity="0.85" />
      <ellipse cx="190" cy="40" rx="7" ry="3.2" transform="rotate(30 190 40)" fill="currentColor" fillOpacity="0.65" />

      {/* titik-titik kecil — benih/partikel */}
      <circle cx="76" cy="70" r="2.2" fill="currentColor" fillOpacity="0.45" />
      <circle cx="148" cy="62" r="1.8" fill="currentColor" fillOpacity="0.4" />
      <circle cx="214" cy="72" r="2.4" fill="currentColor" fillOpacity="0.45" />
      <circle cx="20" cy="76" r="1.6" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}
