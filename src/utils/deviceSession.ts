const DEVICE_KEY = 'wdj_pin_device_v1';
const memory = new Map<string, string>();
export interface PinDevice { deviceId: string; secret: string; name: string }
export function getPinDevice(): PinDevice | null {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); } catch { return null; }
}
export function rememberPinDevice(device: PinDevice) {
  // Move existing Auth tokens out of persistent storage when PIN mode is enabled.
  for (const key of Object.keys(localStorage)) {
    if (/^sb-.*-auth-token/.test(key)) {
      const value = localStorage.getItem(key); if (value) memory.set(key, value);
      localStorage.removeItem(key);
    }
  }
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
}
export function forgetPinDevice() { localStorage.removeItem(DEVICE_KEY); memory.clear(); }
export const deviceSessionStorage = {
  getItem: (key: string) => getPinDevice() ? memory.get(key) ?? null : localStorage.getItem(key),
  setItem: (key: string, value: string) => { if (getPinDevice()) { memory.set(key, value); localStorage.removeItem(key); } else localStorage.setItem(key, value); },
  removeItem: (key: string) => { memory.delete(key); localStorage.removeItem(key); },
};
// Other tabs must drop any old unlocked session when device settings change.
window.addEventListener('storage', e => { if (e.key === DEVICE_KEY) window.location.reload(); });

window.addEventListener('pageshow', event => { if (event.persisted && getPinDevice()) window.location.reload(); });
