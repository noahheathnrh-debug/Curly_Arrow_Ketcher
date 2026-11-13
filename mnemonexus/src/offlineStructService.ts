import type {
  StructService,
  StructServiceProvider,
} from 'ketcher-core';

/**
 * A chemistry engine that does no chemistry.
 *
 * Ketcher normally ships Indigo compiled to WebAssembly — around 21 MB — to
 * convert between formats, lay structures out, aromatise, and so on. A mechanism
 * exercise needs none of that: puzzles are authored as KET, KET is parsed by
 * plain TypeScript inside `ketcher-core`, and the structures arrive already laid
 * out because they were drawn by hand.
 *
 * So this provider exists to satisfy the editor's constructor and nothing else.
 * Every method rejects rather than returning something plausible: if the trainer
 * ever starts depending on real conversion, the failure should name the method
 * that was called rather than silently producing an empty structure.
 */

const unavailable = (operation: string) => () =>
  Promise.reject(
    new Error(
      `The mechanism trainer runs without a chemistry engine, so "${operation}" is unavailable. ` +
        'Puzzles are authored as KET, which needs no conversion.',
    ),
  );

/** Methods that are wiring rather than chemistry. */
const BOOKKEEPING = new Set(['addKetcherId', 'removeKetcherId', 'setKetcherId'])

function createOfflineStructService(): StructService {
  return new Proxy({} as StructService, {
    get(_target, property) {
      const name = String(property)

      // Bookkeeping the editor does while wiring itself up. Nothing to do with
      // chemistry, so it must not fail — rejecting here stops the editor
      // mounting at all.
      if (BOOKKEEPING.has(name)) return () => undefined

      // Asked at start-up to decide whether a server is reachable. Answering
      // honestly keeps that check quiet.
      if (name === 'info') {
        return () =>
          Promise.resolve({
            indigoVersion: 'offline',
            imagoVersions: [],
            isAvailable: false,
          })
      }

      return unavailable(name)
    },
  })
}

export const offlineStructServiceProvider: StructServiceProvider = {
  mode: 'standalone',
  createStructService: createOfflineStructService,
}
