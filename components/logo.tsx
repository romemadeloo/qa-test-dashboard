// App mark: a lab flask with bubbling liquid and smoke rising from the neck. The puffs drift
// upward (logo-puff in globals.css); reduced-motion turns that off. app/icon.svg is the static copy.
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id="qa-logo-liquid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="#8965e5" />
        </linearGradient>
      </defs>

      {/* Smoke */}
      <g fill="#8965e5">
        <circle className="logo-puff" cx="15.5" cy="9.6" r="2.4" opacity="0.75" />
        <circle className="logo-puff" cx="19.2" cy="7" r="3" opacity="0.6" style={{ animationDelay: '0.6s' }} />
        <circle className="logo-puff" cx="14.8" cy="4" r="2.1" opacity="0.5" style={{ animationDelay: '1.2s' }} />
        <circle className="logo-puff" cx="20.6" cy="2.4" r="1.5" opacity="0.4" style={{ animationDelay: '1.8s' }} />
      </g>

      {/* Liquid and bubbles */}
      <path d="M8.6 25.5 H25.4 L28 29.8 Q29.2 31.6 27 31.6 H7 Q4.8 31.6 6 29.8 Z" fill="url(#qa-logo-liquid)" />
      <g fill="#ffffff" opacity="0.75">
        <circle cx="12" cy="28.6" r="1.1" />
        <circle cx="18.6" cy="27.6" r="0.8" />
        <circle cx="22.4" cy="29.6" r="0.9" />
      </g>

      {/* Flask */}
      <path
        d="M13 13 V19.5 L5.2 30 Q3.6 32.5 6.6 32.5 H27.4 Q30.4 32.5 28.8 30 L21 19.5 V13"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M11 13 H23" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
