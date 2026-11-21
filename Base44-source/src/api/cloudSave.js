import { validSave, saveVersion, playerCollections } from './saveFormat.js';

export const cloudEnabled = import.meta.env.VITE_CLOUD_SAVES === 'true' && import.meta.env.MODE !== 'base44';

let revision = 0;

export function saveKey() {
  const stored = localStorage.getItem('eldritch-cloud-key-v1');
  if (stored) return stored;
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('eldritch-cloud-key-v1', key);
  return key;
}

async function request(method, body) {
  const response = await fetch('/api/save', {
    method,
    headers: { Authorization: 'Bearer ' + saveKey(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Cloud save request failed');
  revision = result.revision;
  return result.save;
}

export const loadCloudSave = () => request('GET');
export const storeCloudSave = save => request('PUT', { revision, save });
export const hasCloudSave = () => revision > 0;

export function packSave(data) {
  const save = { version: saveVersion, player: data.User[0] };
  for (const field of playerCollections) save[field] = data[field] ?? [];
  save.Fusion = save.Fusion.filter(fusion => fusion.playerOwner === save.player.id);
  if (!validSave(save)) throw new Error('The save has invalid player data.');
  return save;
}
