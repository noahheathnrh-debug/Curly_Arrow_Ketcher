import type { StructService, StructServiceOptions, StructServiceProvider } from 'ketcher-core';
// @ts-expect-error resolved by the pack config to ketcher-standalone's source (its package exports only the built bundle)
import StandaloneStructService from '@ketcher-standalone-struct/standaloneStructService';

/**
 * Ketcher's own standalone Indigo service, unchanged, over the in-thread worker (`inThreadWorker.ts`) and the pack's
 * WebAssembly (`indigoModule.ts`). Conversions (SMILES, InChI, MOL), layout and clean-up, aromaticity, CIP labels and
 * structure checks all become available to the editor.
 *
 * Indigo starts on the editor's first call (it asks for `info` as it mounts), so only activities that need chemistry
 * should use this provider. Arrow puzzles use `offlineStructServiceProvider`, which needs nothing loaded.
 */
export const indigoStructServiceProvider: StructServiceProvider = {
  mode: 'standalone',
  createStructService: (options: StructServiceOptions): StructService => new StandaloneStructService(options) as StructService,
};
