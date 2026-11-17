import React from 'react';
import {
  findIconMetadata,
  getMacroIconLibrary,
  getMacroIconPath,
} from '../iconCatalog';

export const INLINE_CUSTOM_ICON_IDS = new Set([
  'copy-plus', 'layers-plus', 'plus-square', 'stop-square', 'rows-two', 'type-square',
  'diamonds', 'circle-fill', 'square-fill', 'globe', 'sparkles', 'play-square', 'image',
  'refresh', 'arrow-left', 'arrow-right', 'grid-four', 'lock', 'chat-bubble', 'clock',
  'pause-circle', 'zap', 'maximize', 'apps-plus', 'hexagon-nut', 'minimize', 'moon',
  'framer-bolt', 'database', 'play-triangle', 'terminal', 'volume',
]);

export interface CustomPickerIconProps {
  id: string;
  size?: number;
}

export function CustomPickerIcon({ id, size = 14 }: CustomPickerIconProps) {
  if (id.startsWith('num-')) {
    const digit = id.replace('num-', '');
    return (
      <span
        style={{ fontSize: `${Math.max(10, Math.round(size * 0.85))}px` }}
        className="font-semibold leading-none tracking-tight select-none"
      >
        {digit}
      </span>
    );
  }

  const isInlineIcon = INLINE_CUSTOM_ICON_IDS.has(id);
  const catalogIconPath = isInlineIcon ? undefined : getMacroIconPath(id);
  const iconMetadata = catalogIconPath
    ? findIconMetadata(getMacroIconLibrary(), id)
    : undefined;
  const isFilledIcon = iconMetadata?.t === 'f';

  return (
    <svg
      width={size}
      height={size}
      viewBox={catalogIconPath ? '0 0 24 24' : '0 0 16 16'}
      fill={isFilledIcon ? 'currentColor' : 'none'}
      stroke={isFilledIcon ? 'none' : 'currentColor'}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {id === 'copy-plus' && (
        <>
          <rect x="5" y="5" width="8.5" height="8.5" rx="1.6" fill="currentColor" stroke="none" />
          <path d="M3 10.5V3.8C3 3.1 3.5 2.5 4.2 2.5H10.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.25 7.2V11.3M7.2 9.25H11.3" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'layers-plus' && (
        <>
          <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.6" fill="currentColor" stroke="none" />
          <path d="M13 5.5V12.2C13 12.9 12.5 13.5 11.8 13.5H5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.75 4.7V8.8M4.7 6.75H8.8" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'plus-square' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M8 5.2V10.8M5.2 8H10.8" stroke="#ffffff" strokeWidth="1.4" />
        </>
      )}
      {id === 'stop-square' && (
        <rect x="2.5" y="2.5" width="11" height="11" rx="2.2" fill="currentColor" stroke="none" />
      )}
      {id === 'rows-two' && (
        <>
          <rect x="2.5" y="3" width="11" height="4.2" rx="1.4" fill="currentColor" stroke="none" />
          <rect x="2.5" y="8.8" width="11" height="4.2" rx="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'type-square' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M5.5 5.5H10.5M8 5.5V11" stroke="#ffffff" strokeWidth="1.4" />
        </>
      )}
      {id === 'diamonds' && (
        <>
          <polygon points="8,1.8 10.3,4.1 8,6.4 5.7,4.1" fill="currentColor" stroke="none" />
          <polygon points="8,9.6 10.3,11.9 8,14.2 5.7,11.9" fill="currentColor" stroke="none" />
          <polygon points="4.1,5.7 6.4,8 4.1,10.3 1.8,8" fill="currentColor" stroke="none" />
          <polygon points="11.9,5.7 14.2,8 11.9,10.3 9.6,8" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'circle-fill' && (
        <circle cx="8" cy="8" r="5.5" fill="currentColor" stroke="none" />
      )}
      {id === 'square-fill' && (
        <rect x="3" y="3" width="10" height="10" rx="1.2" fill="currentColor" stroke="none" />
      )}
      {id === 'globe' && (
        <>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="8" cy="8" rx="2.5" ry="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2.8 8H13.2" stroke="currentColor" strokeWidth="1.2" />
        </>
      )}
      {id === 'sparkles' && (
        <>
          <path
            d="M7.5 2L8.8 6.2L13 7.5L8.8 8.8L7.5 13L6.2 8.8L2 7.5L6.2 6.2L7.5 2Z"
            fill="currentColor"
            stroke="none"
          />
          <circle cx="12.5" cy="3.5" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'play-square' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <polygon points="6.5,5.5 10.8,8 6.5,10.5" fill="#ffffff" stroke="none" />
        </>
      )}
      {id === 'image' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <circle cx="5.6" cy="5.8" r="1" fill="#ffffff" stroke="none" />
          <path d="M3.5 11.5L6.8 8.2L9.2 10.5L10.8 9L12.5 11.5" stroke="#ffffff" strokeWidth="1.2" />
        </>
      )}
      {id === 'refresh' && (
        <>
          <path d="M12.5 6A5 5 0 1 0 13 9.5" stroke="currentColor" strokeWidth="1.5" />
          <polyline points="13,3 13,6.2 9.8,6.2" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
      {id === 'arrow-left' && (
        <path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.6" />
      )}
      {id === 'arrow-right' && (
        <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" />
      )}
      {id === 'grid-four' && (
        <>
          <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
          <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
          <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
          <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'lock' && (
        <>
          <rect x="3.2" y="7" width="9.6" height="6.8" rx="1.8" fill="currentColor" stroke="none" />
          <path d="M5.2 7V5.2A2.8 2.8 0 0 1 10.8 5.2V7" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
      {id === 'chat-bubble' && (
        <path
          d="M8 2.5C4.7 2.5 2 4.8 2 7.7C2 9.3 2.8 10.7 4.1 11.6L3.2 13.8L6 12.6C6.6 12.8 7.3 12.9 8 12.9C11.3 12.9 14 10.6 14 7.7C14 4.8 11.3 2.5 8 2.5Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'clock' && (
        <>
          <circle cx="8" cy="8" r="5.8" fill="currentColor" stroke="none" />
          <path d="M8 4.8V8.2L10.4 9.6" stroke="#ffffff" strokeWidth="1.4" />
        </>
      )}
      {id === 'pause-circle' && (
        <>
          <rect x="3.5" y="3" width="3.4" height="10" rx="1.2" fill="currentColor" stroke="none" />
          <rect x="9.1" y="3" width="3.4" height="10" rx="1.2" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'zap' && (
        <polygon
          points="9,1.8 3.5,9 7.8,9 7,14.2 12.5,7 8.2,7"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'maximize' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M6 10L10 6M10 6H7M10 6V9" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'apps-plus' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2.2" fill="currentColor" stroke="none" />
          <circle cx="5.7" cy="5.7" r="1.1" fill="#ffffff" stroke="none" />
          <circle cx="10.3" cy="5.7" r="1.1" fill="#ffffff" stroke="none" />
          <circle cx="5.7" cy="10.3" r="1.1" fill="#ffffff" stroke="none" />
          <path d="M10.3 8.8V11.8M8.8 10.3H11.8" stroke="#ffffff" strokeWidth="1.2" />
        </>
      )}
      {id === 'hexagon-nut' && (
        <>
          <polygon
            points="8,2 13.2,5 13.2,11 8,14 2.8,11 2.8,5"
            fill="currentColor"
            stroke="none"
          />
          <circle cx="8" cy="8" r="2.2" fill="#ffffff" stroke="none" />
        </>
      )}
      {id === 'minimize' && (
        <>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M5.5 7.5V5.5H7.5M10.5 8.5V10.5H8.5" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'moon' && (
        <path
          d="M12.5 9.8A5.2 5.2 0 0 1 6.2 3.5A5.2 5.2 0 1 0 12.5 9.8Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'framer-bolt' && (
        <path
          d="M4 2.5H12V6.5H8L4 2.5ZM4 6.5H8L12 10.5H4V6.5ZM4 10.5H8V14L4 10.5Z"
          fill="currentColor"
          stroke="none"
        />
      )}
      {id === 'database' && (
        <>
          <ellipse cx="8" cy="4.2" rx="4.8" ry="1.8" fill="currentColor" stroke="none" />
          <path
            d="M3.2 6.8C3.2 7.8 5.3 8.6 8 8.6C10.7 8.6 12.8 7.8 12.8 6.8V9.2C12.8 10.2 10.7 11 8 11C5.3 11 3.2 10.2 3.2 9.2V6.8Z"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M3.2 10.8C3.2 11.8 5.3 12.6 8 12.6C10.7 12.6 12.8 11.8 12.8 10.8V12.6C12.8 13.6 10.7 14.4 8 14.4C5.3 14.4 3.2 13.6 3.2 12.6V10.8Z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
      {id === 'play-triangle' && (
        <polygon points="4.5,3 12.8,8 4.5,13" fill="currentColor" stroke="none" />
      )}
      {id === 'terminal' && (
        <>
          <rect x="2" y="2.5" width="12" height="11" rx="2" fill="currentColor" stroke="none" />
          <path d="M4.8 6L7.2 8L4.8 10M8.2 10H11" stroke="#ffffff" strokeWidth="1.3" />
        </>
      )}
      {id === 'volume' && (
        <>
          <polygon points="3,6.2 6,6.2 9.2,3.5 9.2,12.5 6,9.8 3,9.8" fill="currentColor" stroke="none" />
          <path d="M11.2 5.8C12 6.5 12 9.5 11.2 10.2" stroke="currentColor" strokeWidth="1.4" />
        </>
      )}
      {catalogIconPath && <path d={catalogIconPath} />}
    </svg>
  );
}

export default CustomPickerIcon;
