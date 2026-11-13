import Raphael from 'raphael';

/**
 * Works around a packaging bug in `ketcher-core`.
 *
 * `application/render/raphael-ext` loads Raphaël with a bare `require('raphael')`
 * guarded by `typeof window`, so that server-side rendering skips it. The build
 * emits that call verbatim into the ESM output, where `require` does not exist —
 * so importing the built package in a browser throws before anything renders.
 *
 * The editor's own example app never trips over it, because that aliases
 * `ketcher-core` to TypeScript source and runs a CommonJS plugin over it. Only a
 * consumer taking the package as published sees the failure, which is precisely
 * why this project consumes it that way.
 *
 * The shim resolves that one module and refuses everything else, so it cannot
 * quietly paper over some other missing dependency. It has to run before any
 * Ketcher import, hence its own module imported first in `main.tsx`.
 *
 * Delete this once `raphael-ext` uses a static import or a dynamic `import()`.
 */
declare global {
  interface Window {
    require?: (id: string) => unknown;
  }
}

if (typeof window !== 'undefined' && !window.require) {
  window.require = (id: string) => {
    if (id === 'raphael') return Raphael;
    throw new Error(
      `Unexpected require("${id}") from a bundled package. Only 'raphael' is shimmed — see src/raphaelShim.ts.`,
    );
  };
}

export {};
