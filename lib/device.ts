// lib/device.ts
export function getDeviceId() {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('mobius:deviceId');
  if (!id) {
    id = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Math.random()).slice(2);
    localStorage.setItem('mobius:deviceId', id);
  }
  return id;
}
