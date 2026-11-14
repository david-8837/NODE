# HID communication

## Intended QMK interface

The Agent constants in `electron/backgroundAgent.cjs` identify VID `0xFEED`, PID `0x6001`, Usage Page `0xFF60`, and Usage `0x61`. QMK Raw HID is used for 32-byte VIA commands and custom physical events. Standard keyboard and consumer-control reports are separate HID collections and should not be opened as the Raw HID transport.

## Baseline defect and source fix

At baseline, `pollDevice()` accepted a descriptor if VID/PID match and either `usagePage` equals `0xFF60` **or is undefined**; it did not check `usage`. It then opened the first matching path. This could select a non-Raw-HID collection. The source now requires VID/PID, Usage Page `0xFF60`, Usage `0x61`, and a non-empty device path. A regression test proves keyboard, unknown-usage, and other-usage collections are rejected. The user-provided Windows `npm run diagnose:hid` capture on 2026-11-13 found six matching VID/PID descriptors. The Raw HID candidate is index 3, interface MI_01, Usage Page decimal `65376` (`0xFF60`), Usage decimal `97` (`0x61`). The other five descriptors are MI_00/MI_02 keyboard, consumer-control, and system-control collections. In a user-run Agent session, initial open was followed by `0x48F` and a successful reopen. In the controlled cable test, unplugging produced another `0x48F`, followed by a successful reopen of interface 1 after reconnect. The user reports no further error after that final open while idle. The intentional-unplug error is expected; the cause of the initial error before the cable test remains unexplained.

## Ownership and lifecycle

The Agent is intended to be the exclusive owner of the Raw HID path. Studio sends VIA commands through Agent IPC while connected and falls back to browser WebHID when Agent access is unavailable. A successful Agent open now logs the interface number and usage tuple, so the live test can confirm it selected MI_01. Confirming no overlap still requires a Windows trace across Agent connected/disconnected transitions. The current Agent closes the handle on every HID `error` and retries discovery every 1.5 seconds. It does not distinguish transient read errors from removal and exposes only a connected boolean.

## Required diagnostics

Record candidate descriptors with VID/PID, usage page/usage, interface number, path, and product string (avoid logging sensitive unrelated HID devices). Log state transitions and close reasons. Validate the chosen descriptor before opening, guard duplicate opens, reject pending VIA requests on close, and verify the first successful Raw HID exchange. Test unplug/replug, reset, sleep/resume, and simultaneous Studio/browser use on Windows.

## Hardware boundary

The listing confirms the actual interface path and usage tuple, but no HID handle was opened in this review. Windows reconnect behavior still needs a live Agent test.
