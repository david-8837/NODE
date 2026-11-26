import { useEffect } from 'react';

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function useDeviceNotifications(allowDeviceNotifications: boolean) {
  useEffect(() => {
    const bridge = window.macropad;
    const isDesktop = Boolean(window.electronAPI?.isElectron);
    const hasWebNotifications =
      typeof window.Notification !== 'undefined' && window.Notification.permission === 'granted';

    if (
      !bridge ||
      !allowDeviceNotifications ||
      (!isDesktop && !hasWebNotifications)
    ) return;

    return bridge.onEvent((event) => {
      if (!isRecordValue(event)) return;
      const type = event.type;
      if (type !== 'connect' && type !== 'disconnect') return;
      const title = type === 'connect' ? 'Device connected' : 'Device disconnected';
      const body = type === 'connect'
        ? `${typeof event.device === 'string' ? event.device : 'Grid Macro 1'} is ready`
        : 'The Grid Macro 1 was disconnected';

      if (window.electronAPI?.showNotification) {
        void window.electronAPI.showNotification({ title, body });
      } else if (typeof window.Notification !== 'undefined') {
        try {
          new window.Notification(title, { body });
        } catch {
          // Notification permission may be revoked by the OS after the setting is enabled.
        }
      }
    });
  }, [allowDeviceNotifications]);
}
