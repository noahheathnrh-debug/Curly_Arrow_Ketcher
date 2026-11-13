import { plugin } from 'bun';
// @ts-expect-error a plain .mjs helper shared with the Vite configs
import { privateContentPath } from './privateContent.mjs';

/** bun test and bun run resolve `@private-content` to the private folder when it exists (pack builds decide for themselves). */
plugin({
  name: 'private-content',
  setup(build) {
    build.onResolve({ filter: /^@private-content$/ }, () => ({ path: privateContentPath }));
  },
});
