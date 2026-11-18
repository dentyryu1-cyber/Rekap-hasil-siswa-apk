import { useId } from 'react';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function BrandLogo({
  size = 34,
  animated = false,
  className = '',
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, '');
  const bgId = `rk-bg-${uid}`;
  const rimId = `rk-rim-${uid}`;
  const goldId = `rk-gold-${uid}`;
  const cardId = `rk-card-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${animated ? 'splash-logo-svg' : ''} ${className}`}
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="12"
          y1="8"
          x2="84"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#238864" />
          <stop offset="55%" stopColor="#1B6B4F" />
          <stop offset="100%" stopColor="#0E4230" />
        </linearGradient>

        <linearGradient
          id={rimId}
          x1="10"
          y1="6"
          x2="86"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E6B16A" />
          <stop offset="50%" stopColor="#9C5F24" />
          <stop offset="100%" stopColor="#5C320C" />
        </linearGradient>

        <linearGradient
          id={goldId}
          x1="34"
          y1="28"
          x2="78"
          y2="76"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F5C97B" />
          <stop offset="55%" stopColor="#D68B3A" />
          <stop offset="100%" stopColor="#9C5718" />
        </linearGradient>

        <linearGradient
          id={cardId}
          x1="22"
          y1="16"
          x2="66"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EAF2EE" />
        </linearGradient>
      </defs>

      {/* Outer carved wood rim + emerald squircle badge */}
      <rect
        x="4"
        y="4"
        width="88"
        height="88"
        rx="24"
        fill={`url(#${bgId})`}
        stroke={`url(#${rimId})`}
        strokeWidth="3.5"
      />

      {/* Inner subtle bevel highlight */}
      <rect
        x="8"
        y="8"
        width="80"
        height="80"
        rx="20"
        stroke="#FFFFFF"
        strokeOpacity="0.16"
        strokeWidth="1.2"
      />

      {/* Answer sheet card */}
      <g className={animated ? 'splash-sheet-group' : ''}>
        <rect
          x="21"
          y="18"
          width="46"
          height="58"
          rx="9"
          fill={`url(#${cardId})`}
        />
        {/* Sheet header strip */}
        <rect x="27" y="25" width="22" height="5" rx="2.5" fill="#1B6B4F" />
        <circle cx="57" cy="27.5" r="3" fill="#D68B3A" />

        {/* Answer bubbles + row bars */}
        <circle cx="31" cy="39" r="3.6" fill="#1B6B4F" />
        <rect x="38" y="36.8" width="22" height="4.4" rx="2.2" fill="#CFE2D9" />

        <circle cx="31" cy="50" r="3.6" fill="#CFE2D9" />
        <rect x="38" y="47.8" width="18" height="4.4" rx="2.2" fill="#CFE2D9" />

        <circle cx="31" cy="61" r="3.6" fill="#1B6B4F" />
        <rect x="38" y="58.8" width="14" height="4.4" rx="2.2" fill="#CFE2D9" />
      </g>

      {/* Sculpted golden-wood "J" / precision check crest */}
      <path
        d="M52 46 L60 54.5 L77 35"
        stroke="#0E4230"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 46 L60 54.5 L77 35"
        stroke={`url(#${goldId})`}
        strokeWidth="6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? 'splash-check-stroke' : ''}
      />

      {/* Rising analysis bars in bottom-right corner */}
      <g className={animated ? 'splash-bars-group' : ''}>
        <rect x="52" y="65" width="5.5" height="11" rx="2.75" fill="#F5C97B" />
        <rect x="60.5" y="60" width="5.5" height="16" rx="2.75" fill="#E39D49" />
        <rect x="69" y="54" width="5.5" height="22" rx="2.75" fill="#C47425" />
      </g>
    </svg>
  );
}
