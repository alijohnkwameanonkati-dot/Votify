interface VotexaLogoProps {
  className?: string;
}

export function VotexaLogo({ className = '' }: VotexaLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="votifyShieldGrad" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="55%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <path
          d="M16 2.5L27.5 7.5V15.5C27.5 22.3 22.5 27.6 16 29.5C9.5 27.6 4.5 22.3 4.5 15.5V7.5L16 2.5Z"
          fill="#0B1120"
          stroke="url(#votifyShieldGrad)"
          strokeWidth="1.75"
        />
        <path
          d="M10.5 11.5L16 22L21.5 11.5"
          stroke="url(#votifyShieldGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 11.5L16 17.2L19 11.5"
          stroke="#E2E8F0"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
      <span className="font-[Outfit] text-lg font-bold tracking-[0.06em] text-slate-50">
        VOTIFY
      </span>
    </span>
  );
}
