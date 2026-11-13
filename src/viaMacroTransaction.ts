import type { BridgeResult, ViaKeymapSnapshot } from './qmkViaBridge';

type MacroRequest = {
  cmd?: string;
  macroRestore?: { count: number; bytes: number[] };
  allowInterruptedRecovery?: boolean;
  saveRecovery?: (data: { keymap: ViaKeymapSnapshot; macros: { count: number; bytes: number[] } }) => void;
  onProgress?: (phase: string, done: number, total: number) => void;
};
interface MacroContext {
  exchange(command: Uint8Array): Promise<Uint8Array>;
  readLayerCount(): Promise<number>;
  readDeviceKeymap(count: number): Promise<ViaKeymapSnapshot>;
}
const VIA_COMMAND = { getMacroCount: 0x0c, getMacroBufferSize: 0x0d, getMacroBuffer: 0x0e, setMacroBuffer: 0x0f };

export async function runMacroOperation(request: MacroRequest, context: MacroContext): Promise<BridgeResult> {
  async function readMacroChunk(offset: number, length: number): Promise<number[]> {
    const report = await context.exchange(new Uint8Array([VIA_COMMAND.getMacroBuffer, offset >> 8, offset & 0xff, length]));
    if (report.length < 4 + length || report[1] !== (offset >> 8) || report[2] !== (offset & 0xff) || report[3] !== length) throw new Error('Invalid VIA macro buffer response');
    return Array.from(report.slice(4, 4 + length));
  }

  async function readStableMacros(): Promise<{ count: number; bytes: number[] }> {
    const countReport = await context.exchange(new Uint8Array([VIA_COMMAND.getMacroCount]));
    if (countReport.length < 2) throw new Error('Invalid VIA macro count response');
    const count = countReport[1];
    const sizeReport = await context.exchange(new Uint8Array([VIA_COMMAND.getMacroBufferSize]));
    if (sizeReport.length < 3) throw new Error('Invalid VIA macro size response');
    const size = (sizeReport[1] << 8) | sizeReport[2];
    if (size > 4096) throw new Error('Device macro buffer is larger than the supported 4096 bytes');
    const readBuffer = async () => {
      const bytes: number[] = [];
      for (let offset = 0; offset < size; offset += 28) bytes.push(...await readMacroChunk(offset, Math.min(28, size - offset)));
      return bytes;
    };
    const first = await readBuffer(), second = await readBuffer();
    const endCount = await context.exchange(new Uint8Array([VIA_COMMAND.getMacroCount]));
    const endSize = await context.exchange(new Uint8Array([VIA_COMMAND.getMacroBufferSize]));
    if (endCount.length < 2 || endSize.length < 3 || endCount[1] !== count || ((endSize[1] << 8) | endSize[2]) !== size || first.some((value, index) => value !== second[index])) throw new Error('VIA macros changed while being read; retry the backup');
    return { count, bytes: first };
  }

  async function writeMacroBufferVerified(bytes: number[], count: number, progress: (phase: string, done: number, total: number) => void, phase: string): Promise<void> {
    const setAndVerify = async (offset: number, chunk: number[]) => {
      const result = await context.exchange(new Uint8Array([VIA_COMMAND.setMacroBuffer, offset >> 8, offset & 0xff, chunk.length, ...chunk]));
      if (result[1] !== (offset >> 8) || result[2] !== (offset & 0xff) || result[3] !== chunk.length) throw new Error('Invalid VIA macro write acknowledgement');
      const actual = await readMacroChunk(offset, chunk.length);
      if (chunk.some((value, index) => value !== actual[index])) throw new Error(`Macro verification failed at byte ${offset}`);
    };
    // QMK suppresses macro execution while the last buffer byte is non-zero.
    const marker = bytes.length - 1;
    await setAndVerify(marker, [255]);
    for (let offset = 0; offset < marker; offset += 28) {
      const chunk = bytes.slice(offset, Math.min(offset + 28, marker));
      const current = await readMacroChunk(offset, chunk.length);
      if (chunk.some((value, index) => value !== current[index])) await setAndVerify(offset, chunk);
      progress(phase, offset + chunk.length, bytes.length);
    }
    // Keep execution disabled until every byte is read back as a coherent buffer.
    const staged = await readStableMacros();
    if (staged.count !== count || staged.bytes.length !== bytes.length || staged.bytes[marker] !== 255 || bytes.slice(0, marker).some((value, index) => value !== staged.bytes[index])) throw new Error('Staged macro buffer verification failed');
    await setAndVerify(marker, [0]);
    progress(phase, bytes.length, bytes.length);
  }

    if (request.cmd === 'read_via_device_backup') {
      try {
        const progress = (phase: string, done: number, total: number) => {
          try { request.onProgress?.(phase, done, total); } catch { /* Progress is informational. */ }
        };
        progress('Reading keymap', 0, 3);
        const count = await context.readLayerCount();
        if (count < 1 || count > 8) throw new Error('Device layer count is not supported for a complete keymap backup');
        const first = await context.readDeviceKeymap(count);
        const second = await context.readDeviceKeymap(count);
        if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('Device keymap changed during backup; retry');
        progress('Reading macros', 1, 3);
        const macros = await readStableMacros();
        if (!macros.bytes.length || macros.bytes[macros.bytes.length - 1] !== 0 || macros.bytes.filter(byte => byte === 0).length < macros.count) throw new Error('Macro buffer is incomplete or indicates an interrupted write');
        progress('Checking keymap', 2, 3);
        const last = await context.readDeviceKeymap(count);
        if (JSON.stringify(first) !== JSON.stringify(last) || await context.readLayerCount() !== count) throw new Error('Device keymap changed during backup; retry');
        progress('Device backup read', 3, 3);
        return { ok: true, snapshot: first, macroBackup: macros };
      } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
    }

    if (request.cmd === 'read_via_macros') {
      try {
        const macros = await readStableMacros();
        if (!macros.bytes.length || macros.bytes[macros.bytes.length - 1] !== 0 || macros.bytes.filter(byte => byte === 0).length < macros.count) throw new Error('Macro buffer is incomplete or indicates an interrupted write; use a known-good backup for recovery');
        return { ok: true, macroBackup: macros };
      }
      catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
    }

    if (request.cmd === 'restore_via_macros') {
      const target = request.macroRestore;
      if (!target || !Number.isInteger(target.count) || target.count < 0 || target.count > 255 ||
          !Array.isArray(target.bytes) || target.bytes.length < 1 || target.bytes.length > 4096 || target.bytes[target.bytes.length - 1] !== 0 ||
          target.bytes.filter(byte => byte === 0).length < target.count ||
          !target.bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255) ||
          typeof request.saveRecovery !== 'function') return { ok: false, error: 'Invalid macro backup or missing recovery storage' };
      const progress = (phase: string, done: number, total: number) => {
        try { request.onProgress?.(phase, done, total); } catch { /* UI errors must not interrupt recovery. */ }
      };
      let previous: { count: number; bytes: number[] } | null = null;
      let writesStarted = false;
      let interrupted = false;
      try {
        progress('Reading device', 0, 1);
        const layerCount = await context.readLayerCount();
        if (layerCount > 8) throw new Error('Device has more layers than the backup supports');
        const keymap = await context.readDeviceKeymap(layerCount);
        const keymapCheck = await context.readDeviceKeymap(layerCount);
        if (JSON.stringify(keymap) !== JSON.stringify(keymapCheck)) throw new Error('Device keymap changed during the recovery snapshot; retry');
        previous = await readStableMacros();
        // A keymap that changes while macros are captured is not a coherent
        // recovery snapshot. Bracket the macro read with another full read.
        const keymapAfterMacros = await context.readDeviceKeymap(layerCount);
        if (JSON.stringify(keymap) !== JSON.stringify(keymapAfterMacros) || await context.readLayerCount() !== layerCount) {
          throw new Error('Device keymap changed during the recovery snapshot; retry');
        }
        if (previous.bytes.length === 0) throw new Error('Device has no macro buffer');
        interrupted = previous.bytes[previous.bytes.length - 1] !== 0 || previous.bytes.filter(byte => byte === 0).length < previous.count;
        if (interrupted && !request.allowInterruptedRecovery) return { ok: false, error: 'Device macro buffer indicates an interrupted write; no restore was attempted', rollback: 'not-needed', interruptedMacroBuffer: true };
        if (target.count !== previous.count || target.bytes.length !== previous.bytes.length) {
          throw new Error('Backup macro count or buffer size does not match this device');
        }
        progress('Saving recovery copy', 0, 1);
        request.saveRecovery({ keymap, macros: { count: previous.count, bytes: [...previous.bytes] } });
        progress('Writing macros', 0, target.bytes.length);
        writesStarted = target.bytes.some((value, index) => value !== previous!.bytes[index]);
        if (writesStarted) await writeMacroBufferVerified(target.bytes, target.count, progress, 'Writing macros');
        const verified = await readStableMacros();
        if (verified.count !== target.count || verified.bytes.length !== target.bytes.length || verified.bytes.some((value, index) => value !== target.bytes[index])) {
          throw new Error('Final macro read-back did not match the backup');
        }
        progress('Complete', target.bytes.length, target.bytes.length);
        return { ok: true, rollback: 'not-needed' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!writesStarted || !previous) return { ok: false, error: message, rollback: 'not-needed' };
        if (interrupted) return { ok: false, error: message, rollback: 'failed', recoveryError: 'Previous buffer was already incomplete and cannot safely be re-enabled. Use a known-good backup and check the device.' };
        try {
          progress('Recovering previous macros', 0, previous.bytes.length);
          await writeMacroBufferVerified(previous.bytes, previous.count, progress, 'Recovering previous macros');
          const verified = await readStableMacros();
          if (verified.count !== previous.count || verified.bytes.length !== previous.bytes.length || verified.bytes.some((value, index) => value !== previous!.bytes[index])) throw new Error('Recovery verification failed');
          return { ok: false, error: message, rollback: 'verified' };
        } catch (recoveryError) {
          return { ok: false, error: message, rollback: 'failed', recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
        }
      }
    }

  return { ok: false, error: 'Unsupported macro operation' };
}
