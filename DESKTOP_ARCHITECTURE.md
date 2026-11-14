# Desktop architecture

## Components

- `src/App.tsx` contains the React Studio, profile editor, device status, guarded VIA synchronization, and action controls.
- `src/profileFiles.ts` validates/imports/exports full profiles and persists editor state using `cm2.state.v2` in origin-scoped `localStorage`.
- `src/qmkViaBridge.ts` implements the VIA protocol and device bridge; `src/qmkProfileSync.ts` translates a profile to firmware-supported key and encoder mappings.
- `electron/main.cjs` owns the Electron main process, app lifecycle, native action services, and IPC handlers.
- `electron/preload.cjs` exposes a context-isolated API. Agent calls include status, layer/profile selection, profile sync, and VIA passthrough.
- `electron/agentClient.cjs` reconnects to the Agent Named Pipe and correlates request IDs.

## Profile restore and device sync

React loads `cm2.state.v2` at startup and treats an unreadable existing value as a recoverable failure; writes and device synchronization are paused. It keeps a local backup before replacing valid saved state. On QMK connection, Studio reads the device mapping, saves a local pre-sync snapshot, compares it with the selected desktop profile, asks before replacing a conflict, and reads back writes before marking sync complete. Smart/Multi Actions are not represented in stock VIA and are written as `KC_NO` for their device keycode.

The app profile and QMK dynamic map remain distinct stores. Studio does not display a device map as the complete profile because firmware cannot report Smart Actions, custom items, or profile metadata. The Agent profile file is a third store; IPC exists but current renderer code has no sync call site.

## Execution

Studio-open behavior can involve renderer event handlers and desktop APIs; Studio-closed behavior depends on the independent Agent and its own `%APPDATA%\NODE\profiles.json`. The Electron `before-quit` path closes only its AgentClient; it does not itself launch or supervise the Agent. Agent supervisor deployment/lifecycle is therefore a separate process concern.

## Known state model gaps

The visible Studio device status and the Agent HID status are not one canonical state. The profile-save state is local, VIA keymap synchronization has separate guards, and Agent profile generation is independent. These states need explicit UI reporting and an actual sync handshake before they can be treated as one configuration.
