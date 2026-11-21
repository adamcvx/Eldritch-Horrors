import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function localEntityImports() {
  return {
    name: 'eldritch-local-imports',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith('eldritch:')) return '\0' + id;
    },
    load(id) {
      if (!id.startsWith('\0eldritch:')) return;
      const [kind, name] = id.slice('\0eldritch:'.length).split('/');
      if (kind === 'functions') {
        return 'export { unavailableLocally as ' + name + ' } from "/src/api/localBase44.js";';
      }
      const access = name === 'User' ? 'base44.auth' : 'base44.entities.' + name;
      return 'import { base44 } from "/src/api/base44Client.js"; export const ' + name + ' = ' + access + ';';
    },
  };
}

export default defineConfig(async ({ mode }) => {
  const connected = mode === 'base44';
  const compatibility = connected
    ? (await import('@base44/vite-plugin')).default({ legacySDKImports: true })
    : localEntityImports();
  return {
    plugins: [compatibility, react()],
    resolve: { alias: [
      ...(!connected ? [
        { find: /^@\/(entities|functions)\/(\w+)$/, replacement: 'eldritch:$1/$2' },
        { find: '@/integrations/Core', replacement: '/src/api/integrations.js' },
      ] : []),
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ] },
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    },
  };
});
