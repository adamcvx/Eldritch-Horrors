import { randomInt } from 'node:crypto';
import { chooseFusionArtwork, conjureName, fusionParents } from '../../src/api/fusionIdentity.js';
import { getAccountId, isSameOrigin } from '../lib/account.mjs';

function reply(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fusionIdentityHandler(authenticate = getAccountId) {
  return async request => {
    if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
    if (!isSameOrigin(request)) return reply(403, { error: 'Request origin rejected.' });
    try {
      if (!await authenticate()) return reply(401, { error: 'Sign in to fuse horrors.' });
    } catch {
      return reply(503, { error: 'Could not verify your account. Try again.' });
    }

    let input;
    try { input = await request.json(); }
    catch { return reply(400, { error: 'Invalid fusion request.' }); }

    const parents = fusionParents(input ?? {});
    if (!parents) return reply(400, { error: 'Choose two different prime horrors.' });
    const [first, second] = parents.map(parent => parent.name);
    const random = () => randomInt(2 ** 32) / 2 ** 32;
    return reply(200, {
      name: conjureName(first, second, random),
      imageUrl: chooseFusionArtwork(first, second, random),
    });
  };
}

export default fusionIdentityHandler();
