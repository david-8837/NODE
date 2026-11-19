import { useCallback, useEffect, useRef, useState } from 'react';
import type { QmkViaStatus } from './qmkViaBridge';
import padGeometry from './microPadGeometry.json';

export interface DeviceConnectionGateProps {
  status: QmkViaStatus;
  /** Runs the WebHID permission flow; must be invoked from a user gesture. */
  onRetry: () => void | Promise<void>;
}

const STATUS_COPY: Record<QmkViaStatus['state'], { label: string; detail: string }> = {
  searching: {
    label: 'Looking for your Micro Pad…',
    detail: 'Checking connected USB devices.',
  },
  connecting: {
    label: 'Connecting…',
    detail: 'Verifying that the firmware responds.',
  },
  connected: {
    label: 'Connected',
    detail: 'Opening the configurator.',
  },
  disconnected: {
    label: 'Not connected',
    detail: 'Plug the Micro Pad into a USB port, then retry.',
  },
  unavailable: {
    label: 'USB unavailable',
    detail: 'Device access is not available in this window. Use the installed Windows app.',
  },
};

/**
 * Grey/white illustration matching the home-screen MacropadDevice: tall rounded
 * shell, inset plate, status light above the keys and dial at the top right.
 * Geometry is shared with the installer artwork; the interactive home component
 * is deliberately untouched.
 */
function MicroPadIllustration({ active }: { active: boolean }) {
  const stroke = active ? '#666666' : '#aaaaaa';
  const { case: shell, plate, indicator, dial, keys } = padGeometry;
  return (
    <svg
      width="136"
      height="171"
      viewBox={`0 0 ${padGeometry.width} ${padGeometry.height}`}
      role="img"
      aria-label="Micro Pad illustration"
      className="select-none overflow-visible"
      data-pad-shape="home-screen"
    >
      <rect data-part="case" x={shell.x} y={shell.y} width={shell.width} height={shell.height} rx={shell.radius} fill="#ffffff" stroke={stroke} strokeWidth="2" />
      <rect data-part="inner-frame" x={plate.x} y={plate.y} width={plate.width} height={plate.height} rx={plate.radius} fill="#ebebeb" />
      <circle data-part="status-light" cx={indicator.cx} cy={indicator.cy} r={indicator.radius} fill={active ? '#555555' : '#888888'} />
      <circle data-part="dial" cx={dial.cx} cy={dial.cy} r={dial.radius} fill="#fafafa" stroke={active ? '#777777' : '#999999'} strokeWidth="2" />
      <line data-part="dial-marker" x1={dial.cx - dial.markerHalfLength} y1={dial.cy} x2={dial.cx + dial.markerHalfLength} y2={dial.cy} stroke={active ? '#777777' : '#999999'} strokeWidth="2" strokeLinecap="round" />
      {keys.rows.flatMap((y, row) =>
        keys.columns.map((x, col) => (
          <rect
            key={`r${row + 1}c${col + 1}`}
            data-part="key"
            x={x}
            y={y}
            width={keys.width}
            height={keys.height}
            rx={keys.radius}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth="2"
          />
        ))
      )}
    </svg>
  );
}

/**
 * Full-screen gate shown until the firmware has actually answered. The main
 * configurator is not rendered behind it, so no editing control can be reached
 * while the device is absent. Profiles live in app state and local storage and
 * are untouched by this component, so nothing is lost while disconnected.
 */
export default function DeviceConnectionGate({ status, onRetry }: DeviceConnectionGateProps) {
  const [retrying, setRetrying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const busy = retrying || status.state === 'connecting' || status.state === 'searching';
  const copy = STATUS_COPY[status.state] ?? STATUS_COPY.disconnected;

  const handleRetry = useCallback(async () => {
    if (busy) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      if (mountedRef.current) setRetrying(false);
    }
  }, [busy, onRetry]);

  return (
    <div
      data-testid="device-connection-gate"
      className="fixed inset-0 z-[9999] flex flex-col bg-[#f4f4f4]"
    >
      {/* Sleek native titlebar integrating seamlessly with Electron's titleBarOverlay */}
      <header
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="h-[38px] w-full bg-[#0e0e0e] flex items-center justify-between px-[18px] shrink-0 select-none border-b border-[#1c1c1c]"
      >
        <div className="flex items-center gap-[4px]">
          <span className="font-bold text-[13px] tracking-[0.16em] text-white leading-none">NODE</span>
          <span className="text-[11px] text-[#8e8e93] font-medium tracking-wide">studio</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <MicroPadIllustration active={status.state === 'connected'} />

        <h1 className="mt-7 text-[22px] font-semibold tracking-[-0.01em] text-[#111318]">
          Connect your Micro Pad to continue.
        </h1>

        <div className="mt-3 flex items-center gap-2" role="status" aria-live="polite">
          <span
            aria-hidden
            className={`inline-block h-[9px] w-[9px] rounded-full ${
              status.state === 'connected'
                ? 'bg-[#12b76a]'
                : busy
                  ? 'bg-[#f79009] animate-pulse'
                  : 'bg-[#98a2b3]'
            }`}
          />
          <span className="text-[13.5px] font-medium text-[#344054]">{copy.label}</span>
        </div>

        <p className="mt-1.5 max-w-[380px] text-[12.5px] leading-[1.55] text-[#667085]">
          {status.error ? status.error : copy.detail}
        </p>

        <button
          type="button"
          onClick={() => { void handleRetry(); }}
          disabled={busy}
          data-testid="device-gate-retry"
          className="mt-6 min-w-[190px] rounded-full bg-[#111111] hover:bg-[#222222] px-7 py-[11px] text-[13.5px] font-medium text-white transition-all duration-150 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
        >
          {busy ? 'Checking…' : 'Retry Connection'}
        </button>

        <p className="mt-5 max-w-[420px] text-[11.5px] leading-[1.6] text-[#98a2b3]">
          Your profiles, layers and presets are saved on this computer and stay intact while the
          device is unplugged. Editing unlocks once the Micro Pad responds.
        </p>
      </div>
    </div>
  );
}
