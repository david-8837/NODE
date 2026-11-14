import { useEffect, useRef, useState } from 'react';
import type { LayerLight, QmkViaBridge } from '../qmkViaBridge';
import { qmkHsvToRp2040ZeroHex, rp2040ZeroColorToQmkHsv } from '../onboardLed';

const OFF: LayerLight = { effect: 0, hue: 0, saturation: 0, brightness: 0 };
const prefix = 'cm2.layer-lighting-recovery.';
function saveCopy(layers: LayerLight[], kind: 'previous' | 'initial'): string {
  const storage = window.localStorage;
  const base = `${prefix}${Date.now()}`;
  let key = base, suffix = 0;
  while (storage.getItem(key) !== null) { if (++suffix > 1000) throw new Error('Could not allocate a recovery copy'); key = `${base}.${suffix}`; }
  const text = JSON.stringify({ format: 'node-layer-lighting-recovery', version: 1, kind, createdAt: new Date().toISOString(), layers });
  storage.setItem(key, text);
  if (storage.getItem(key) !== text) throw new Error('Could not verify recovery storage');
  return key;
}
function latestCopy(): string {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && /^cm2\.layer-lighting-recovery\.\d+(?:\.\d+)?$/.test(key)) keys.push(key); }
  return keys.sort((a, b) => {
    const parts = (key: string) => key.slice(prefix.length).split('.').map(Number);
    const x = parts(a), y = parts(b); return y[0] - x[0] || (y[1] || 0) - (x[1] || 0);
  })[0] || '';
}
export default function LayerLightingPanel({ bridge, connected }: { bridge: QmkViaBridge; connected: boolean }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [layers, setLayers] = useState<LayerLight[]>([]);
  const [layer, setLayer] = useState(0);
  const [effect, setEffect] = useState(1);
  const [color, setColor] = useState('#0051ff');
  const [brightness, setBrightness] = useState(80);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Read the device before editing its layer lighting.');
  const [recoveryKey, setRecoveryKey] = useState(() => { try { return latestCopy(); } catch { return ''; } });
  const busyRef = useRef(false), epoch = useRef(0);
  useEffect(() => { if (!connected) { epoch.current++; setReady(null); setLayers([]); setMessage('Device disconnected. Read its settings after reconnecting.'); } }, [connected]);
  useEffect(() => {
    const value = layers[layer]; if (!value) return;
    setEffect(value.effect); setColor(qmkHsvToRp2040ZeroHex(value.hue, value.saturation)); setBrightness(Math.round(value.brightness * 100 / 255));
  }, [layers, layer]);
  const run = async (fn: () => Promise<void>) => {
    if (!connected || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await fn(); } catch (error) { setReady(null); setMessage(`Operation failed; device state may be unknown: ${error instanceof Error ? error.message : String(error)}`); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const read = () => void run(async () => {
    const generation = epoch.current;
    setMessage('Reading and verifying layer lighting…');
    const result = await bridge.request({ cmd: 'read_layer_lighting' });
    if (generation !== epoch.current) return;
    if (!result.ok || !result.layerLighting) { setReady(null); setMessage(result.error || 'Could not read layer lighting'); return; }
    setReady(result.layerLighting.ready); setLayers(result.layerLighting.layers);
    setMessage(result.layerLighting.ready ? 'Device settings read and verified.' : 'Lighting storage is uninitialized. Initialization is optional and sets all four layers off.');
  });
  const initialize = () => void run(async () => {
    if (ready !== false || !window.confirm('Initialize all four device layers with the LED off? This changes the active LED. Only blank, compatible lighting storage will be initialized.')) return;
    const generation = epoch.current;
    const result = await bridge.request({ cmd: 'initialize_layer_lighting', layerLightingInitial: Array.from({ length: 4 }, () => ({ ...OFF })), saveLightingRecovery: values => setRecoveryKey(saveCopy(values, 'initial')) });
    if (generation !== epoch.current) return;
    if (result.ok && result.layerLighting) { setLayers(result.layerLighting.layers); setReady(true); setMessage('All four layers initialized and verified.'); }
    else { setReady(null); setMessage(`${result.error || 'Initialization failed'}${result.lightingWriteUncertain ? ' Device state may be unknown; read it again before retrying.' : ''}`); }
  });
  const save = () => void run(async () => {
    if (!ready) return;
    const hsv = rp2040ZeroColorToQmkHsv(color);
    if (!hsv) { setMessage('Select a valid color.'); return; }
    const setting: LayerLight = { effect, ...hsv, brightness: Math.round(brightness * 255 / 100) };
    const generation = epoch.current;
    const result = await bridge.request({ cmd: 'write_layer_lighting', layerLightingWrite: { layer, setting, expected: layers }, saveLightingRecovery: values => setRecoveryKey(saveCopy(values, 'previous')) });
    if (generation !== epoch.current) return;
    if (result.ok && result.layerLighting) { setLayers(result.layerLighting.layers); setMessage(`Layer ${layer + 1} saved and all four layers verified.`); }
    else { setReady(null); setMessage(`${result.error || 'Save failed'}${result.lightingWriteUncertain ? ' Device state may be unknown; read it again before retrying.' : ''}`); }
  });
  const download = () => {
    try {
      const text = localStorage.getItem(recoveryKey); if (!text) throw new Error('Recovery copy is unavailable');
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'node-layer-lighting-recovery.json'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage('Recovery download started. Verify that the file was saved.');
    } catch (error) { setMessage(`Recovery download failed: ${error instanceof Error ? error.message : String(error)}`); }
  };
  return <section aria-label="Experimental per-layer lighting" className="mt-3 rounded-2xl bg-[#e3e3e3] p-4 text-[#444] text-xs">
    <h3 className="font-semibold text-sm">Per-layer lighting <span className="font-normal text-[#777]">· experimental</span></h3>
    <p className="mt-2 leading-5">Requires the separate per-layer lighting TEST firmware for the supported 2 MiB RP2040-Zero. This is experimental and has not been validated on a physical pad. Flashing may reset VIA keymaps and macros: back up both first and verify the backups. Lighting recovery copies are saved in this browser’s local storage, can be lost on reinstall, and are not a full device backup; download a copy separately. Automatic lighting recovery is not available.</p>
    <button type="button" onClick={read} disabled={busy || !connected} className="mt-2 rounded-full bg-white px-4 py-1.5 disabled:opacity-50">Read device lighting</button>
    {ready === false && <button type="button" onClick={initialize} disabled={busy || !connected} className="ml-2 mt-2 rounded-full bg-white px-4 py-1.5 disabled:opacity-50">Initialize four layers off…</button>}
    {ready && <div className="mt-3 space-y-2">
      <label className="flex justify-between items-center">Layer <select aria-label="Lighting layer" value={layer} disabled={busy} onChange={event => setLayer(Number(event.target.value))} className="rounded bg-white p-1">{[0,1,2,3].map(i => <option key={i} value={i}>Layer {i+1}</option>)}</select></label>
      <label className="flex justify-between items-center">Effect <select aria-label="Lighting effect" value={effect} disabled={busy} onChange={event => setEffect(Number(event.target.value))} className="rounded bg-white p-1"><option value={0}>Off</option><option value={1}>Solid</option><option value={2}>Breath</option><option value={6}>Rainbow</option></select></label>
      <label className="flex justify-between items-center">Color <input aria-label="Lighting color" type="color" value={color} disabled={busy} onChange={event => setColor(event.target.value)} /></label>
      <label className="flex justify-between items-center">Brightness {brightness}% <input aria-label="Lighting brightness" type="range" min="0" max="100" value={brightness} disabled={busy} onChange={event => setBrightness(Number(event.target.value))} /></label>
      <button type="button" onClick={save} disabled={busy || !connected} className="rounded-full bg-[#0051ff] px-4 py-1.5 text-white disabled:opacity-50">Save this layer</button>
    </div>}
    {recoveryKey && <button type="button" onClick={download} className="mt-2 ml-2 rounded-full bg-white px-4 py-1.5">Download lighting recovery copy</button>}
    <p role="status" aria-live="polite" className="mt-2 leading-5">{message}</p>
  </section>;
}
