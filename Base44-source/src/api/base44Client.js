import { createClient } from '@base44/sdk';
import { localBase44 } from './localBase44.js';

export const isLocalPreview = import.meta.env.MODE !== 'base44';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = isLocalPreview ? localBase44 : createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});
