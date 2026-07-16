"use client";

interface WalletSparklineProps {
  className?: string;
}

const POINTS = [42, 48, 44, 52, 49, 58, 55, 62, 68, 72, 78, 85];

export function WalletSparkline({ className }: WalletSparklineProps) {
  const width = 160;
  const height = 64;
  const padding = 4;
  const max = Math.max(...POINTS);
  const min = Math.min(...POINTS);
  const range = max - min || 1;

  const coords = POINTS.map((value, index) => {
    const x = padding + (index / (POINTS.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x} ${height} L ${coords[0]!.x} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="walletSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
        </linearGradient>
        <filter id="walletSparkGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaPath} fill="url(#walletSparkFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#a5b4fc"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#walletSparkGlow)"
      />
    </svg>
  );
}
