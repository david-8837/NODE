/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FeedbackToast } from '../src/components/FeedbackToast';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('FeedbackToast component', () => {
  it('renders toast message with correct styling', async () => {
    await act(async () => {
      root.render(createElement(FeedbackToast, { message: 'Settings saved' }));
    });

    const toast = container.querySelector('div');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toBe('Settings saved');
    expect(toast?.className).toContain('fixed bottom-5');
    expect(toast?.className).toContain('bg-black text-white');
  });
});
