/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from '../src/components/AppHeader';
import type { QmkViaStatus } from '../src/qmkViaBridge';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('AppHeader component', () => {
  const defaultStatus: QmkViaStatus = {
    state: 'connected',
    device: 'Grid Macro 1',
    path: 'USB#VID_FEED&PID_6001',
    fw: 'v1.2.0',
    layers: 4,
  };

  it('renders brand logo and handles logo click', async () => {
    const onLogoClick = vi.fn();
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Keymap',
          canUndo: true,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          deviceStatus: defaultStatus,
          onToggleDeviceConnection: vi.fn(),
          onLogoClick,
          onNavTabClick: vi.fn(),
        })
      );
    });

    const logoButton = container.querySelector<HTMLButtonElement>('button[title="NODE studio"]');
    expect(logoButton).not.toBeNull();
    expect(logoButton?.textContent).toContain('NODE');

    act(() => {
      logoButton?.click();
    });
    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it('shows undo/redo buttons in Keymap tab and handles clicks when enabled', async () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Keymap',
          canUndo: true,
          canRedo: true,
          onUndo,
          onRedo,
          deviceStatus: defaultStatus,
          onToggleDeviceConnection: vi.fn(),
          onLogoClick: vi.fn(),
          onNavTabClick: vi.fn(),
        })
      );
    });

    const undoBtn = container.querySelector<HTMLButtonElement>('button[title="Undo"]');
    const redoBtn = container.querySelector<HTMLButtonElement>('button[title="Redo"]');

    expect(undoBtn).not.toBeNull();
    expect(redoBtn).not.toBeNull();
    expect(undoBtn?.disabled).toBe(false);
    expect(redoBtn?.disabled).toBe(false);

    act(() => {
      undoBtn?.click();
    });
    expect(onUndo).toHaveBeenCalledTimes(1);

    act(() => {
      redoBtn?.click();
    });
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('disables undo/redo buttons when canUndo and canRedo are false', async () => {
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Keymap',
          canUndo: false,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          deviceStatus: defaultStatus,
          onToggleDeviceConnection: vi.fn(),
          onLogoClick: vi.fn(),
          onNavTabClick: vi.fn(),
        })
      );
    });

    const undoBtn = container.querySelector<HTMLButtonElement>('button[title="Undo"]');
    const redoBtn = container.querySelector<HTMLButtonElement>('button[title="Redo"]');

    expect(undoBtn?.disabled).toBe(true);
    expect(redoBtn?.disabled).toBe(true);
  });

  it('hides undo/redo controls when activeNav is not Keymap', async () => {
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Preset',
          canUndo: true,
          canRedo: true,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          deviceStatus: defaultStatus,
          onToggleDeviceConnection: vi.fn(),
          onLogoClick: vi.fn(),
          onNavTabClick: vi.fn(),
        })
      );
    });

    const undoBtn = container.querySelector('button[title="Undo"]');
    const redoBtn = container.querySelector('button[title="Redo"]');

    expect(undoBtn).toBeNull();
    expect(redoBtn).toBeNull();
  });

  it('renders navigation tabs and invokes onNavTabClick', async () => {
    const onNavTabClick = vi.fn();
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Keymap',
          canUndo: false,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          deviceStatus: defaultStatus,
          onToggleDeviceConnection: vi.fn(),
          onLogoClick: vi.fn(),
          onNavTabClick,
        })
      );
    });

    const navButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('nav button'));
    expect(navButtons.map((btn) => btn.textContent)).toEqual(['Keymap', 'Preset', 'Settings']);

    act(() => {
      navButtons[1]?.click(); // Preset
    });
    expect(onNavTabClick).toHaveBeenCalledWith('Preset');

    act(() => {
      navButtons[2]?.click(); // Settings
    });
    expect(onNavTabClick).toHaveBeenCalledWith('Settings');
  });

  it('displays connected device info and triggers connection toggle', async () => {
    const onToggle = vi.fn();
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Keymap',
          canUndo: false,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          deviceStatus: defaultStatus,
          onToggleDeviceConnection: onToggle,
          onLogoClick: vi.fn(),
          onNavTabClick: vi.fn(),
        })
      );
    });

    const statusBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Disconnect Grid Macro 1"]'
    );
    expect(statusBtn).not.toBeNull();
    expect(statusBtn?.textContent).toContain('Grid Macro 1');

    act(() => {
      statusBtn?.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('displays disconnected state properly', async () => {
    const disconnectedStatus: QmkViaStatus = {
      state: 'disconnected',
    };
    await act(async () => {
      root.render(
        createElement(AppHeader, {
          activeNav: 'Keymap',
          canUndo: false,
          canRedo: false,
          onUndo: vi.fn(),
          onRedo: vi.fn(),
          deviceStatus: disconnectedStatus,
          onToggleDeviceConnection: vi.fn(),
          onLogoClick: vi.fn(),
          onNavTabClick: vi.fn(),
        })
      );
    });

    const statusBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Connect Grid Macro 1 via QMK/VIA"]'
    );
    expect(statusBtn).not.toBeNull();
    expect(statusBtn?.textContent).toContain('Not connected');
  });
});
