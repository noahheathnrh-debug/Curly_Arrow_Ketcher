import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// @ts-expect-error a plain .mjs helper shared with the Bun preload
import { packPrivateContentPath } from './privateContent.mjs'

const addonDirectory = path.dirname(fileURLToPath(import.meta.url))

/**
 * Build the trainer as a single file, for packaging as a `.mnxpack`.
 *
 * A pack has exactly one code entry. Extra chunks are not an option: the add-on
 * runs in a frame with an opaque origin, which cannot fetch a URL the parent
 * created, so anything not in the entry bundle is unreachable. Hence no code
 * splitting and no dynamic imports left unresolved.
 *
 * React is bundled in. The manifest describes React as host-provided, and for a
 * compiled-in add-on sharing one JS context that is right — two Reacts in one
 * tree break hooks. A sandboxed add-on has its own frame and its own tree, so
 * its own copy is fine and there is no other way to get one.
 *
 * The separate `vite.config.ts` still builds the standalone app, which stays the
 * fastest way to work on the trainer without installing anything.
 */

/** Shared with the standalone build. See the note there. */
function dropMonomerLibrary(): Plugin {
  return {
    name: 'trainer:drop-monomer-library',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!/monomers(\.modern)?(\.js)?$/.test(source)) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved) return null
      return /[\/]editor[\/]data[\/]monomers/.test(resolved.id)
        ? path.resolve(addonDirectory, 'src/emptyMonomerLibrary.ket.ts')
        : null
    },
  }
}

const standaloneStruct = path.resolve(addonDirectory, '../packages/ketcher-standalone/src/infrastructure/services/struct')

/**
 * Indigo inside the pack (see src/indigo/). Two upstream files are rewritten as they are bundled, and each rewrite
 * fails the build if it no longer matches, so an Indigo or Ketcher upgrade cannot silently break it:
 * - Indigo's glue finds its WebAssembly with `new URL(..., import.meta.url)`. Library mode would inline that 7 MB file
 *   into the code as base64; the add-on passes the bytes itself (`wasmBinary`), so the URL is replaced by a name.
 * - ketcher-standalone's worker answers on the worker global `self`; in-thread, that is `indigoSelf`.
 */
function indigoInPack(): Plugin {
  const swap = (code: string, pattern: RegExp, replacement: string, file: string) => {
    if (!pattern.test(code)) throw new Error(`indigo-in-pack: ${file} no longer contains ${pattern}; check the Indigo upgrade.`)
    return code.replace(pattern, replacement)
  }
  return {
    name: 'trainer:indigo-in-pack',
    enforce: 'pre',
    transform(code, id) {
      const file = id.replace(/\\/g, '/').split('?')[0]
      if (file.endsWith('/indigo-ketcher/indigo-ketcher-separate-wasm-norender.js')) {
        const named = swap(code, /new URL\("indigo-ketcher-norender-[^"]+\.wasm",\s*import\.meta\.url\)\.href/g, '"indigo.wasm"', file)
        return swap(named, /import\.meta\.url/g, '""', file)
      }
      if (file === `${standaloneStruct.replace(/\\/g, '/')}/indigoWorker.ts`) {
        const shim = JSON.stringify(path.resolve(addonDirectory, 'src/indigo/inThreadWorker.ts').replace(/\\/g, '/'))
        return `import { indigoSelf as __indigoSelf } from ${shim};\n` + swap(code, /\bself\.(postMessage|onmessage)\b/g, '__indigoSelf.$1', file)
      }
      return null
    },
  }
}

/**
 * A time limit on the editor's curly-arrow router (ketcher-core `mechanism/route`). It searches up to 2,000 candidate
 * curves per approach direction and sweeps every direction when none is clean, so an arrow squeezed between groups can
 * freeze the page for 5 to 80 seconds (timed 2026-11-11 with `bun run times`): in Watch, in Your turn as the learner
 * draws, and in practice. The limit stops the search after ROUTE_BUDGET_MS per arrow and keeps the best curve found so
 * far. This stands in until the fork is rebuilt with a budget of its own; the build fails if the router changes shape.
 */
const ROUTE_BUDGET_MS = 150
function routeTimeBudget(): Plugin {
  const swap = (code: string, from: string, to: string, file: string) => {
    if (!code.includes(from)) throw new Error(`route-time-budget: ${file} no longer contains ${JSON.stringify(from)}; check the router.`)
    return code.replace(from, to)
  }
  return {
    name: 'trainer:route-time-budget',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]mechanism[\\/]route(\.modern)?\.js$/.test(id)) return null
      const file = path.basename(id)
      let out = swap(code, 'return results.length >= CANDIDATE_BUDGET;',
        'return results.length >= CANDIDATE_BUDGET || performance.now() > routeDeadline;', file)
      out = swap(out, 'function routeArrow(request, struct, metrics, options, prebuiltObstacles) {',
        `var routeDeadline = Infinity;\nfunction routeArrow(request, struct, metrics, options, prebuiltObstacles) {\n  routeDeadline = performance.now() + ${ROUTE_BUDGET_MS};`, file)
      // The basic sweep has no budget check of its own: stop it too, once it has at least one curve.
      out = swap(out, '                var shape = buildFromTangents(p0, anchor, tail, head, profile);',
        '                if (results.length && spent()) return;\n                var shape = buildFromTangents(p0, anchor, tail, head, profile);', file)
      out = swap(out, '      if (!best || best.physical) continue;',
        '      if (best && performance.now() > routeDeadline) break;\n      if (!best || best.physical) continue;', file)
      // A memo: the editor routes every arrow again on each reload and each lone-pair toggle (about six times a Watch
      // frame), from scratch. Once the anchors, destinations and obstacles are built, the route depends on nothing
      // else, so identical inputs return the curve already found. A changed anchor (a lone pair painted late, a
      // moved atom) changes the key, so a stale curve is never reused.
      out = swap(out, 'var routeDeadline = Infinity;\n',
        'var routeDeadline = Infinity;\nvar routeMemo = new Map();\n' +
        'function routeMemoKeyOf(source, destinations, obstacles) {\n' +
        '  try { return JSON.stringify([source.position, source.outward, source.cone, source.graceRadius, source.minimumBulge, destinations.map(function (d) { return [d.position, d.trim, d.sector, d.inward, d.cone, d.pinned]; }), obstacles]); } catch (e) { return null; }\n' +
        '}\n', file)
      const boundary = /\n(\s*)var boundary = [\w.]*enclosingBonds\(struct\);/
      if (!boundary.test(out)) throw new Error(`route-time-budget: ${file} no longer builds its boundary where expected; check the router.`)
      out = out.replace(boundary, (line, indent) => `${line}\n${indent}var routeMemoKey = routeMemoKeyOf(source, destinations, obstacles);\n${indent}if (routeMemoKey && routeMemo.has(routeMemoKey)) return routeMemo.get(routeMemoKey);`)
      out = swap(out, '  route.metrics.candidatesEvaluated = evaluated;\n  return route;',
        '  route.metrics.candidatesEvaluated = evaluated;\n  if (routeMemoKey) { if (routeMemo.size > 500) routeMemo.clear(); routeMemo.set(routeMemoKey, route); }\n  return route;', file)
      return { code: out, map: null }
    },
  }
}

export default defineConfig({
  plugins: [react(), dropMonomerLibrary(), indigoInPack(), routeTimeBudget()],
  resolve: {
    preserveSymlinks: true,
    // ketcher-react declares core as "*". Always use the explicit fork above,
    // never a transitive upstream copy lacking mechanism APIs.
    dedupe: ['react', 'react-dom', 'ketcher-core'],
    alias: [
      // Private content (lecture enzymes) only in the owner's build (MNX_PACK_CONTENT=private), else the empty stand-in.
      { find: /^@private-content$/, replacement: packPrivateContentPath },
      { find: /^(?:node:)?events$/, replacement: path.resolve(addonDirectory, 'node_modules/events/events.js') },
      // The currently built fork contains Rollup-relative dependency imports
      // whose dist/node_modules files are absent. Resolve that one package from
      // this add-on without changing or copying the editor's implementation.
      { find: /^(?:\.\.\/)+node_modules\/subscription\/index\.modern\.js$/, replacement: path.resolve(addonDirectory, 'node_modules/subscription/index.js') },
      // Keep the editor's real geometry dependency. The full Paper.js build
      // includes the PaperScript compiler (runtime Function), while paper-core
      // provides Point/Path/group outlines without that sandbox-incompatible compiler.
      { find: /^paper$/, replacement: path.resolve(addonDirectory, 'node_modules/paper/dist/paper-core.js') },
      // The 3D viewer and three.js behind it. Reached only from a dialog this
      // add-on's capability profile withholds. See src/miewStub.ts.
      { find: 'miew-react', replacement: path.resolve(addonDirectory, 'src/miewStub.ts') },
      // Ketcher's standalone Indigo service, from source, over this add-on's in-thread worker and pack WebAssembly.
      { find: /^@ketcher-standalone-struct\/(.*)$/, replacement: `${standaloneStruct}/$1` },
      { find: '_indigo-worker-import-alias_', replacement: path.resolve(addonDirectory, 'src/indigo/inThreadWorker.ts') },
      { find: '_indigo-ketcher-import-alias_', replacement: path.resolve(addonDirectory, 'src/indigo/indigoModule.ts') },
    ],
  },
  define: {
    // Without this React ships its development build, which is larger and
    // slower, and the pack code cap is on uncompressed bytes.
    'process.env.NODE_ENV': JSON.stringify('production'),
    // ketcher-standalone reads this to pick which "Indigo ready" event to send; one Indigo build here, so none special.
    'process.env.SEPARATE_INDIGO_RENDER': JSON.stringify(''),
    // Some of Ketcher's dependencies expect Node's `global`. The standalone app
    // shims it in its index.html, but a pack has no HTML of its own — the host
    // supplies the document — so the bundle has to be self-sufficient.
    global: 'globalThis',
  },
  build: {
    outDir: 'pack-build',
    emptyOutDir: true,
    // No module preload or split chunks — one file is the whole point.
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 8192,
    lib: {
      entry: path.resolve(addonDirectory, 'src/packEntry.tsx'),
      formats: ['iife'],
      name: 'MechanismTrainerAddon',
      fileName: () => 'main.cjs',
      cssFileName: 'main',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
