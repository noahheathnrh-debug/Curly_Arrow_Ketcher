import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import base from '../../vite.config.pack';

const here = path.dirname(fileURLToPath(import.meta.url));
export default mergeConfig(base, {
  build: {
    outDir: process.env.CHECK_OUT ?? path.resolve(here, 'out'),
    emptyOutDir: true,
    lib: { entry: path.resolve(here, 'entry.ts'), formats: ['iife'], name: 'EditorCheck', fileName: () => 'check.js', cssFileName: 'check' },
  },
});
