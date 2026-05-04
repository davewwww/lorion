import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { lorionReact } from '../src/vite';

const playgroundRoot = dirname(fileURLToPath(import.meta.url));
const routesDirectory = resolve(playgroundRoot, 'src/routes');
const generatedRouteTree = resolve(playgroundRoot, 'src/routeTree.gen.ts');
const lorion = lorionReact({
  workspaceRoot: playgroundRoot,
  routesDirectory,
  indexRouteFile: false,
  defaultSelection: ['default'],
});

export default defineConfig({
  root: playgroundRoot,
  server: {
    port: 3200,
  },
  resolve: {
    alias: {
      '@lorion-org/provider-selection': resolve(
        playgroundRoot,
        '../../provider-selection/src/index.ts',
      ),
      '@lorion-org/react': resolve(playgroundRoot, '../src/index.ts'),
    },
  },
  plugins: [
    lorion.capabilityLoader,
    tanstackRouter({
      target: 'react',
      generatedRouteTree,
      routesDirectory,
      virtualRouteConfig: lorion.routeConfig,
    }),
    react(),
  ],
});
