import { motion } from 'motion/react';
import { findIconMetadata } from '../iconCatalog';
import { getMacroIconLibrary } from '../iconLibrary';

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

export function SettingsSwitch({
  checked,
  onChange,
  disabled = false,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      title={title}
      onClick={onChange}
      className={`w-[29px] h-[16px] rounded-full p-[2px] flex items-center transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#000000] justify-end' : 'bg-[#b3b3b3] justify-start'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        className="w-[12px] h-[12px] rounded-full bg-white shadow-xs"
      />
    </button>
  );
}

type PresetAppIconConfig = {
  iconId: string;
  background: string;
  foreground: string;
  iconMode: 'fill' | 'stroke';
};

const PRESET_APP_ICON_CONFIGS: Record<string, PresetAppIconConfig> = {
  chatgpt: { iconId: 'brand-openai', background: 'linear-gradient(145deg, #20b98e, #087157)', foreground: '#ffffff', iconMode: 'stroke' },
  vscode: { iconId: 'brand-vscode', background: 'linear-gradient(145deg, #35b8ed, #0068b7)', foreground: '#ffffff', iconMode: 'stroke' },
  github: { iconId: 'brand-github', background: 'linear-gradient(145deg, #41454d, #17191e)', foreground: '#ffffff', iconMode: 'fill' },
  terminal: { iconId: 'terminal', background: 'linear-gradient(145deg, #26384b, #101722)', foreground: '#a5f3c3', iconMode: 'stroke' },
  docker: { iconId: 'brand-docker', background: 'linear-gradient(145deg, #43bdf0, #0878c9)', foreground: '#ffffff', iconMode: 'fill' },
  chrome_devtools: { iconId: 'brand-chrome', background: 'linear-gradient(145deg, #424854, #20242c)', foreground: '#ffffff', iconMode: 'fill' },
  photoshop: { iconId: 'brand-adobe-photoshop', background: 'linear-gradient(145deg, #06395a, #001e36)', foreground: '#45b8ff', iconMode: 'stroke' },
  illustrator: { iconId: 'brand-adobe-illustrator', background: 'linear-gradient(145deg, #542100, #2b0800)', foreground: '#ffad35', iconMode: 'stroke' },
  premiere: { iconId: 'brand-adobe-premiere', background: 'linear-gradient(145deg, #392d72, #18113e)', foreground: '#b9a8ff', iconMode: 'stroke' },
  aftereffects: { iconId: 'brand-adobe-after-effects', background: 'linear-gradient(145deg, #342361, #171333)', foreground: '#d9a9ff', iconMode: 'stroke' },
  davinci: { iconId: 'brand-davinciresolve', background: 'linear-gradient(145deg, #343a46, #171b22)', foreground: '#ffffff', iconMode: 'fill' },
  blender: { iconId: 'brand-blender', background: 'linear-gradient(145deg, #39576b, #182a39)', foreground: '#ff9a44', iconMode: 'fill' },
  figma: { iconId: 'brand-figma', background: 'linear-gradient(145deg, #353535, #171717)', foreground: '#ffffff', iconMode: 'fill' },
  framer: { iconId: 'brand-framer', background: 'linear-gradient(145deg, #25baff, #0751e7)', foreground: '#ffffff', iconMode: 'fill' },
  canva: { iconId: 'brand-canva', background: 'linear-gradient(145deg, #00c4cc, #7134d8)', foreground: '#ffffff', iconMode: 'fill' },
  audacity: { iconId: 'brand-audacity', background: 'linear-gradient(145deg, #343b70, #171b37)', foreground: '#ffe36b', iconMode: 'fill' },
  affinity: { iconId: 'brand-affinity', background: 'linear-gradient(145deg, #6053b7, #14677a)', foreground: '#ffffff', iconMode: 'fill' },
  excel: { iconId: 'brand-microsoft-excel', background: 'linear-gradient(145deg, #20a366, #075b36)', foreground: '#ffffff', iconMode: 'fill' },
  word: { iconId: 'brand-microsoft-word', background: 'linear-gradient(145deg, #3d8de6, #1557b0)', foreground: '#ffffff', iconMode: 'fill' },
  powerpoint: { iconId: 'brand-microsoft-powerpoint', background: 'linear-gradient(145deg, #f17848, #b93c1f)', foreground: '#ffffff', iconMode: 'fill' },
  notion: { iconId: 'brand-notion', background: 'linear-gradient(145deg, #ffffff, #e8e8e8)', foreground: '#171717', iconMode: 'fill' },
  slack: { iconId: 'brand-slack', background: 'linear-gradient(145deg, #ffffff, #f0eaf2)', foreground: '#611f69', iconMode: 'fill' },
  zoom: { iconId: 'brand-zoom', background: 'linear-gradient(145deg, #55a5ff, #1674e8)', foreground: '#ffffff', iconMode: 'fill' },
  obs: { iconId: 'brand-obsstudio', background: 'linear-gradient(145deg, #424a56, #17191f)', foreground: '#ffffff', iconMode: 'fill' },
  discord: { iconId: 'brand-discord', background: 'linear-gradient(145deg, #8790ff, #4d58d7)', foreground: '#ffffff', iconMode: 'fill' },
  spotify: { iconId: 'brand-spotify', background: 'linear-gradient(145deg, #47e184, #14a84e)', foreground: '#102117', iconMode: 'fill' },
  windows: { iconId: 'brand-windows', background: 'linear-gradient(145deg, #35a6ed, #0068bc)', foreground: '#ffffff', iconMode: 'fill' },
};

function getPresetAppIconPath(iconId: string): string | undefined {
  return getMacroIconLibrary()?.d?.[iconId];
}

export function PresetAppIcon({ id, size = 30 }: { id: string; size?: number }) {
  const config = PRESET_APP_ICON_CONFIGS[id];
  if (!config) return null;

  const iconPath = getPresetAppIconPath(config.iconId);

  return (
    <div
      data-preset-icon={id}
      aria-hidden="true"
      className="flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: config.background,
        color: config.foreground,
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 2px 7px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      {iconPath && (
        <svg
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          viewBox="0 0 24 24"
          fill={config.iconMode === 'fill' ? 'currentColor' : 'none'}
          stroke={config.iconMode === 'stroke' ? 'currentColor' : 'none'}
          strokeWidth={config.iconMode === 'stroke' ? 1.7 : 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </svg>
      )}
    </div>
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

const INLINE_CUSTOM_ICON_IDS = new Set([
  'copy-plus', 'layers-plus', 'plus-square', 'stop-square', 'rows-two', 'type-square',
  'diamonds', 'circle-fill', 'square-fill', 'globe', 'sparkles', 'play-square', 'image',
  'refresh', 'arrow-left', 'arrow-right', 'grid-four', 'lock', 'chat-bubble', 'clock',
  'pause-circle', 'zap', 'maximize', 'apps-plus', 'hexagon-nut', 'minimize', 'moon',
  'framer-bolt', 'database', 'play-triangle', 'terminal', 'volume',
]);

export function CustomPickerIcon({ id, size = 14 }: { id: string; size?: number }) {
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
  const catalogIconPath = isInlineIcon ? undefined : getPresetAppIconPath(id);
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

