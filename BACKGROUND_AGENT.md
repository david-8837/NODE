# Background Agent

## Current design

`electron/backgroundAgent.cjs` is a standalone Node process. It opens the QMK Raw HID interface through `node-hid`, processes VIA responses and custom 32-byte hardware events, runs a gesture engine and desktop action executor, persists a local profile file, and serves JSON-line requests on `\\.\pipe\node-studio-ipc`. `agentProtocol.cjs` defines message types and a newline decoder. `agentClient.cjs` reconnects with a fixed interval. `agentSupervisor.cjs` reserves a supervisor pipe, launches a child, and applies crash backoff.

## Findings

- Profile and gesture data load from a separate Agent file. Studio now syncs validated profiles after comparing the saved content revision and asks before replacing a divergent Agent profile.
- Corrupt Agent profile files are preserved; a validated, explicitly synced Studio profile is required for recovery. IPC profile payloads now receive bounded structural validation.
- HID selection requires the exact VID/PID, Usage Page, Usage ID, and a non-empty path.
- The Agent treats every HID error as disconnection. It polls for a replacement every 1.5 seconds without explicit discovering/reconnecting/error states.
- Pipe input has message framing but the baseline handler does not validate message type/payload schemas comprehensively or impose a maximum line size.
- Agent action execution is independent of React for Studio-closed use. While Studio is connected, the renderer owns foreground action dispatch and the Agent only reports events, preventing both paths from executing the same gesture. Standalone Agent dispatch skips key shortcuts already emitted by QMK/VIA and handles desktop-only actions.
- The supervisor script exists, but Electron main only creates an AgentClient; this source does not establish that the supervisor is launched or registered for logon in every deployment.

The review branch now filters the exact Raw HID collection, validates profile shape and generation input, backs up prior Agent profile JSON, and keeps corrupt existing profile files intact. Agent IPC tests use temporary profile files instead of the user's `%APPDATA%` location. The sync payload includes all profiles/layers, encoder actions, active identity, and a SHA-256 Studio revision; Studio pauses on Agent storage failures and revision conflicts. Foreground Studio and standalone Agent dispatch have a single-owner rule to avoid duplicate key output.

## Remaining reliability targets

Add an explicit protocol/version handshake, complete per-message schema validation, a maximum pipe line size, deduplication for retried action events, controlled reconnect states, a single Raw HID owner, and useful diagnostics. Keep Windows-only execution availability tied to an active user session and running computer. USB events cannot execute when the computer is asleep, shut down, or the Agent is not running.
