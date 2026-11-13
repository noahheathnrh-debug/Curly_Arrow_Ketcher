// @ts-expect-error indigo-ketcher ships no types; it is the Emscripten module factory
import createIndigo from 'indigo-ketcher/binaryWasmNoRender';

/**
 * Indigo (EPAM, Apache 2.0) as Ketcher's own standalone service expects it: a function returning a promise of the
 * Emscripten module. The pack config points ketcher-standalone's `_indigo-ketcher-import-alias_` here.
 *
 * The WebAssembly is not next to the script, as the glue assumes: a sandboxed frame has an opaque origin and no
 * network, so it cannot fetch a URL. The add-on reads the bytes from its own pack (`host.asset`) and hands them over
 * as `wasmBinary`. The no-render build is used: Ketcher draws structures itself, so Indigo's renderer would be dead
 * weight (about 4 MB).
 */

let source: (() => Promise<ArrayBuffer>) | null = null;

/** Where the WebAssembly bytes come from. Set once, by the pack entry, before any chemistry is asked for. */
export function setIndigoWasmSource(load: () => Promise<ArrayBuffer>) {
  source = load;
}

/**
 * Never rejects: ketcher-standalone waits on this promise for every command and posts nothing if it rejects, which
 * would leave the editor waiting forever. A module that failed to start answers every call by throwing the reason, so
 * each command fails with it instead.
 */
export default function indigoModuleFn(): Promise<unknown> {
  const failed = (why: string) => new Proxy({}, {
    get: (_target, property) => (property === 'then' ? undefined : () => { throw new Error(`Indigo could not start: ${why}`); }),
  });
  if (!source) return Promise.resolve(failed('the add-on did not say where its WebAssembly is.'));
  return source()
    .then((bytes) => createIndigo({ wasmBinary: new Uint8Array(bytes), locateFile: (file: string) => file }))
    .catch((error: unknown) => failed(error instanceof Error ? error.message : String(error)));
}
