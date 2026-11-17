import React from 'react';

export interface FlatDialControlProps {
  selected: boolean;
  angle: number;
  title: string;
  onClick: () => void;
}

export function FlatDialControl({
  selected,
  angle,
  title,
  onClick,
}: FlatDialControlProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[39px] h-[39px] rounded-full relative flex items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
        selected
          ? 'border-[#0051ff] shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : 'border-transparent hover:border-[#0051ff] hover:z-10'
      }`}
    >
      <svg
        width="39"
        height="39"
        viewBox="0 0 40 40"
        className="transition-transform duration-150 pointer-events-none"
        style={{ transform: `rotate(${angle - 45}deg)` }}
      >
        <defs>
          <linearGradient id="dialUpperLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1b1b1b" />
            <stop offset="48%" stopColor="#353535" />
            <stop offset="50%" stopColor="#4c4c4c" />
            <stop offset="52%" stopColor="#262626" />
            <stop offset="100%" stopColor="#333333" />
          </linearGradient>
          <linearGradient id="dialSelectedBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0051ff" />
            <stop offset="49%" stopColor="#0051ff" />
            <stop offset="51%" stopColor="#003ec7" />
            <stop offset="100%" stopColor="#004be8" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={selected ? 'url(#dialSelectedBlue)' : 'url(#dialUpperLeft)'}
          stroke={selected ? '#0051ff' : '#262626'}
          strokeWidth="0.8"
        />
        <line
          x1="6.5"
          y1="33.5"
          x2="33.5"
          y2="6.5"
          stroke={selected ? 'rgba(255,255,255,0.45)' : '#4a4a4a'}
          strokeWidth="1.1"
          strokeOpacity="0.7"
        />
      </svg>
    </button>
  );
}

export default FlatDialControl;
