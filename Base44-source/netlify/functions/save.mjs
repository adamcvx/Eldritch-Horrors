import { getAccountId, isSameOrigin } from '../lib/account.mjs';
import { createClient } from '@libsql/client/web';
import { validSave } from '../../src/api/saveFormat.js';

const limit = 300_000;
let schema;

function respond(status, data) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function saveHandler(client, authenticate = getAccountId) {
  let ready;
  return async request => {
    if (!['GET', 'PUT'].includes(request.method)) return respond(405, { error: 'Method not allowed' });
    if (request.method === 'PUT' && !isSameOrigin(request)) return respond(403, { error: 'Request origin rejected' });
    try {
      const id = await authenticate();
      if (!id) return respond(401, { error: 'Sign in to access your save' });
      ready ??= client.execute(`CREATE TABLE IF NOT EXISTS single_player_saves (
        id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).catch(error => { ready = undefined; throw error; });
      await ready;

      if (request.method === 'GET') {
        const result = await client.execute({
          sql: 'SELECT revision, payload FROM single_player_saves WHERE id = ?', args: [id],
        });
        const row = result.rows[0];
        return respond(200, row ? { revision: Number(row.revision), save: JSON.parse(row.payload) } : { revision: 0, save: null });
      }

      const reader = request.body?.getReader();
      if (!reader) return respond(400, { error: 'Save body required' });
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          return respond(413, { error: 'Save is too large' });
        }
        chunks.push(Buffer.from(value));
      }

      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return respond(400, { error: 'Invalid JSON' }); }
      if (!Number.isSafeInteger(body?.revision) || body.revision < 0 || !validSave(body.save)) {
        return respond(400, { error: 'Invalid save' });
      }

      const payload = JSON.stringify(body.save);
      const result = body.revision === 0 ? await client.execute({
        sql: 'INSERT INTO single_player_saves (id, revision, payload) VALUES (?, 1, ?) ON CONFLICT(id) DO NOTHING',
        args: [id, payload],
      }) : await client.execute({
        sql: 'UPDATE single_player_saves SET revision = revision + 1, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND revision = ?',
        args: [payload, id, body.revision],
      });
      if (!result.rowsAffected) return respond(409, { error: 'This save changed in another tab. Reload before playing again.' });
      return respond(200, { revision: body.revision + 1 });
    } catch {
      return respond(503, { error: 'Save storage is temporarily unavailable' });
    }
  };
}

export default function handler(request) {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
  if (!url || !authToken) return respond(503, { error: 'Save storage is not configured' });
  schema ??= saveHandler(createClient({ url, authToken }));
  return schema(request);
}
