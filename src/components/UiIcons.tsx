import React from 'react';

export function IsometricKeyIcon({
  type,
  active,
}: {
  type: 'B' | 'A' | 'MA' | 'S';
  active: boolean;
}) {
  const strokeColor = active ? '#000000' : '#4a4a4a';

  if (type === 'MA') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 13.5L22.5 18L14 22.5L5.5 18L14 13.5Z"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 18V20.2L14 24.7L22.5 20.2V18"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 4.2L22.5 8.7L14 13.2L5.5 8.7L14 4.2Z"
          fill={active ? '#0051ff' : 'white'}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 8.7V10.9L14 15.4L22.5 10.9V8.7"
          fill={active ? '#0051ff' : 'white'}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <text
          x="14"
          y="10.2"
          textAnchor="middle"
          fill={strokeColor}
          fontSize="5.4"
          fontWeight="600"
          transform="rotate(-25 14 9)"
        >
          M
        </text>
        <text
          x="14"
          y="20.2"
          textAnchor="middle"
          fill={strokeColor}
          fontSize="5.4"
          fontWeight="600"
          transform="rotate(-25 14 19)"
        >
          A
        </text>
      </svg>
    );
  }

  return (
    <svg width="30" height="26" viewBox="0 0 30 26" fill="none">
      <path
        d="M15 4.2L26.2 10.4L15 16.6L3.8 10.4L15 4.2Z"
        stroke={strokeColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 10.4V14.2L15 20.4L26.2 14.2V10.4"
        stroke={strokeColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <text
        x="15"
        y="12.5"
        textAnchor="middle"
        fill={strokeColor}
        fontSize="7.5"
        fontWeight="600"
        transform="rotate(-26 15 11)"
      >
        {type}
      </text>
      {type === 'S' && (
        <path
          d="M20.5 3.2L21.4 5.9L24.1 6.8L21.4 7.7L20.5 10.4L19.6 7.7L16.9 6.8L19.6 5.9L20.5 3.2Z"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

export function ArrowKeyGlyph({ dir }: { dir: 'right' | 'left' | 'down' | 'up' }) {
  const rotation =
    dir === 'right'
      ? 0
      : dir === 'down'
      ? 90
      : dir === 'left'
      ? 180
      : -90;
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="#222222"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" />
    </svg>
  );
}

export function InfoCircleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.2V11.2" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WarningTriangleIcon({ color }: { color: string }) {
  return (
    <svg
      width="15"
      height="14"
      viewBox="0 0 16 15"
      fill="none"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5L14.8 13.5H1.2L8 1.5Z" />
      <path d="M8 6V9.2" />
      <circle cx="8" cy="11.4" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

export function EmptyKeyPlusIcon({
  size = 16,
  stroke = '#ffffff',
}: {
  size?: number;
  stroke?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className="pointer-events-none"
    >
      <rect
        x="1.75"
        y="1.75"
        width="14.5"
        height="14.5"
        rx="6"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <line
        x1="9"
        y1="5.8"
        x2="9"
        y2="12.2"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="5.8"
        y1="9"
        x2="12.2"
        y2="9"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
