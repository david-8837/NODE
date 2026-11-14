# Profile synchronization

## Stores and identities

1. **Studio profile:** `cm2.state.v2` in Electron/browser-origin localStorage. Contains full profiles, active indices, custom actions, layer names, and lighting settings. This is the authoritative editable full profile in the current design.
2. **Agent profile:** `%APPDATA%\NODE\profiles.json` (or `~/.node-studio/profiles.json` fallback). Contains host gesture/action data plus a decimal generation. This is the data the Agent executes when Studio is closed.
3. **QMK device keymap:** VIA dynamic key and encoder mappings persisted by firmware. Does not contain full profile identity, Smart/Multi Actions, or custom items.
4. **CircuitPython config:** `/keymap.json` on CIRCUITPY, separate from QMK and Studio.

## Current safeguards

Studio validates its local profile and import, keeps a previous valid local copy, pauses on unreadable state, backs up the current QMK keymap before writes, checks external changes, prompts on initial conflict, and verifies readback. Standard VIA writes cover only supported actions. The Agent IPC has `expectedGeneration` checks and response generations. Studio now sends its profile identity and SHA-256 content revision to the Agent, prompts before replacing a divergent Agent profile, and synchronizes all key layers and encoder actions using generation compare-and-swap. The Agent saves a restorable `.bak` before replacement.

## Current gaps

- There is no unified revision across QMK mappings and VIA macros; Agent profile generation covers only the Agent file.
- Agent profile loading does not fully validate structure or active profile identity. Parse failure falls through to writing a default over the same file.
- Agent IPC accepts any object with a `profiles` array, including empty arrays, and `BigInt(expectedGeneration)` can throw on malformed input.
- Agent profile generation is neither a Studio revision nor a device revision. It cannot prove that QMK mappings match the full profile.
- Device keymap has no profile identity/generation. Compare/readback verifies mappings, not custom host-side actions.
- There is no atomic transaction across the three stores.

The Agent-side source validates non-empty profile sets (unique IDs, 1–8 object layers, and a valid active profile), rejects malformed expected generations, preserves a pre-write `.bak`, and refuses to write over unreadable persisted data except during an explicit validated profile sync. Studio displays sync failures and stops on unreadable Agent storage or stale-generation conflicts. It asks for confirmation on a divergent saved profile and mirrors subsequent Studio edits for that app session.

## Required policy

Keep the Studio full profile as the editable source. Assign profile UUID plus schema version and monotonically increasing revision. On Agent handshake, compare identity/revision and content hash, validate before write, preserve a restorable previous file, then report saved/Agent-confirmed state. For device mappings, report a separate read/compare/write/readback status. Reject empty or invalid profile sets unless an explicit user action intentionally creates a replacement. A stale or divergent store must be surfaced; never select by message arrival time.

## Recovery

Keep Studio local backup, Agent file backup, QMK keymap/encoder snapshot, and VIA macro backup separately. Do not silently auto-restore one over another. A recovery should identify the source, target, revision, data included, and verification result.
