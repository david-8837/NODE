/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  findReferenceConflicts,
  cleanReferenceConflicts,
  referencesAtOrAfter,
} from '../src/referenceSafety';
import { ReferenceConflictModal } from '../src/components/ReferenceConflictModal';

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

describe('Reference Safety & Clean On Delete', () => {
  it('finds exact and shifted profile references across layers and keys', () => {
    const profiles = [
      {
        id: 'prof-1',
        name: 'Default Profile',
        layers: [
          {
            r1c1: { binding: 'Profile 2', label: 'P2', actionType: 'Basic input' },
            r1c2: { binding: 'Profile 3', label: 'P3', actionType: 'Basic input' },
            r1c3: { binding: 'Volume Up', label: 'Vol+', actionType: 'Basic input' },
          },
        ],
      },
      {
        id: 'prof-2',
        name: 'Untitled Profile',
        layers: [{ r1c1: {} }],
      },
      {
        id: 'prof-3',
        name: 'Work Profile',
        layers: [{ r1c1: {} }],
      },
    ];

    // Deleting Profile 2 (0-based index 1)
    const conflicts = findReferenceConflicts(profiles, null, 'profile', 1);
    expect(conflicts).toHaveLength(2);
    expect(conflicts[0]).toMatchObject({
      location: 'Default Profile (Layer 1) • Key 1',
      binding: 'Profile 2',
      label: 'P2',
      isExact: true,
    });
    expect(conflicts[1]).toMatchObject({
      location: 'Default Profile (Layer 1) • Key 2',
      binding: 'Profile 3',
      label: 'P3',
      isExact: false,
    });
  });

  it('cleans exact references and shifts later references correctly when deleting a profile', () => {
    const profiles = [
      {
        id: 'prof-1',
        name: 'Default Profile',
        layers: [
          {
            r1c1: { binding: 'Profile 2', label: 'P2', actionType: 'Basic input' },
            r1c2: { binding: 'Profile 3', label: 'P3', actionType: 'Basic input' },
            r1c3: { binding: 'Volume Up', label: 'Vol+', actionType: 'Basic input' },
          },
        ],
      },
      {
        id: 'prof-2',
        name: 'Untitled Profile',
        layers: [{ r1c1: {} }],
      },
      {
        id: 'prof-3',
        name: 'Work Profile',
        layers: [{ r1c1: {} }],
      },
    ];

    // Clean references pointing to or after index 1 (Profile 2)
    const { profiles: cleaned } = cleanReferenceConflicts(profiles, null, 'profile', 1);

    // Key 1 (was pointing to deleted Profile 2) should be completely reset/blank
    expect(cleaned[0].layers[0].r1c1).toMatchObject({
      actionType: 'Basic input',
      label: '',
      binding: '',
    });

    // Key 2 (was pointing to Profile 3) should now point to Profile 2 (P2)
    expect(cleaned[0].layers[0].r1c2).toMatchObject({
      binding: 'Profile 2',
      label: 'P2',
    });

    // Key 3 (unrelated) should remain unchanged
    expect(cleaned[0].layers[0].r1c3).toMatchObject({
      binding: 'Volume Up',
      label: 'Vol+',
    });

    // After filtering out the deleted profile (index 1), remaining profiles must have no out-of-bounds references
    const nextProfiles = cleaned.filter((_, i) => i !== 1);
    expect(referencesAtOrAfter(nextProfiles, 'profile', nextProfiles.length)).toBe(false);
  });

  it('renders ReferenceConflictModal with conflict details and triggers cancel or clean', async () => {
    const onCancel = vi.fn();
    const onCleanAndDelete = vi.fn();

    const conflicts = [
      {
        location: 'Default Profile (Layer 1) • Key 1',
        binding: 'Profile 2',
        label: 'P2',
        isExact: true,
      },
    ];

    await act(async () => {
      root.render(
        createElement(ReferenceConflictModal, {
          open: true,
          kind: 'profile',
          targetIndex: 1,
          targetName: 'Untitled Profile',
          conflicts,
          onCancel,
          onCleanAndDelete,
        })
      );
    });

    expect(container.textContent).toContain('Profile in Use');
    expect(container.textContent).toContain('Default Profile (Layer 1) • Key 1');
    expect(container.textContent).toContain('P2');

    // Cancel click
    const buttons = container.querySelectorAll('button');
    const cancelButton = Array.from(buttons).find((b) => b.textContent?.includes('Cancel'));
    const cleanButton = Array.from(buttons).find((b) => b.textContent?.includes('Clean Keys & Delete'));

    expect(cancelButton).toBeDefined();
    expect(cleanButton).toBeDefined();

    await act(async () => {
      cancelButton!.click();
    });
    expect(onCancel).toHaveBeenCalledOnce();

    await act(async () => {
      cleanButton!.click();
    });
    expect(onCleanAndDelete).toHaveBeenCalledOnce();

    // When open=false, nothing is rendered
    await act(async () => {
      root.render(
        createElement(ReferenceConflictModal, {
          open: false,
          kind: 'profile',
          targetIndex: 1,
          targetName: 'Untitled Profile',
          conflicts,
          onCancel,
          onCleanAndDelete,
        })
      );
    });
    expect(container.textContent).toBe('');
  });
});
