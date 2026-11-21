import { createHash } from 'node:crypto';
import { getUser } from '@netlify/identity';

export async function getAccountId() {
  const user = await getUser();
  if (typeof user?.id !== 'string' || !user.id) return null;
  return createHash('sha256').update('netlify-identity:' + user.id).digest('hex');
}

export function isSameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
