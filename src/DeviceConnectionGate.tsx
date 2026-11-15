import { useCallback, useEffect, useRef, useState } from 'react';
import type { QmkViaStatus } from './qmkViaBridge';

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

/** Simple line illustration of the 3x3 pad plus encoder; no external assets. */
function MicroPadIllustration({ active }: { active: boolean }) {
  const stroke = active ? '#0051ff' : '#c9ced8';
  return (
    <svg
      width="168"
      height="150"
      viewBox="0 0 168 150"
      role="img"
      aria-label="Micro Pad illustration"
      className="select-none"
    >
      <rect x="8" y="8" width="152" height="134" rx="18" fill="#ffffff" stroke={stroke} strokeWidth="2.5" />
      <circle cx="126" cy="38" r="15" fill="none" stroke={stroke} strokeWidth="2.5" />
      <circle cx="126" cy="38" r="4" fill={stroke} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={26 + col * 34}
            y={62 + row * 24}
            width="26"
            height="18"
            rx="5"
            fill="none"
            stroke={stroke}
            strokeWidth="2"
          />
        ))
      )}
      <rect x="26" y="26" width="26" height="18" rx="5" fill="none" stroke={stroke} strokeWidth="2" />
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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f4f6fa] px-6 text-center"
    >
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
        className="mt-6 min-w-[190px] rounded-full bg-[#0051ff] px-7 py-[11px] text-[13.5px] font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {busy ? 'Checking…' : 'Retry Connection'}
      </button>

      <p className="mt-5 max-w-[420px] text-[11.5px] leading-[1.6] text-[#98a2b3]">
        Your profiles, layers and presets are saved on this computer and stay intact while the
        device is unplugged. Editing unlocks once the Micro Pad responds.
      </p>
    </div>
  );
}
