/**
 * Ketcher's Indigo worker, run on the add-on frame's own thread.
 *
 * ketcher-standalone talks to Indigo through a Web Worker: its `StandaloneStructService` posts commands and listens
 * for replies, and `indigoWorker.ts` answers them. Inside a sandboxed pack there is no URL to start a worker from, so
 * this object plays both parts in one thread. The pack config rewrites the two `self.` references in
 * `indigoWorker.ts` to `indigoSelf` below, so Ketcher's command handling is reused unchanged.
 *
 * Nothing loads until the first command: the worker module (and with it Indigo's WebAssembly) is imported on demand.
 * Indigo calls are synchronous inside; for the small molecules taught here they take milliseconds.
 */

type Listener = (event: { data: unknown }) => void;
const listeners = new Set<Listener>();

/** Stands in for the worker global inside ketcher-standalone's `indigoWorker.ts`. */
export const indigoSelf: { onmessage: Listener | null; postMessage: (message: unknown) => void } = {
  onmessage: null,
  postMessage: (message) => {
    for (const listener of [...listeners]) listener({ data: message });
  },
};

let started: Promise<unknown> | null = null;
// @ts-expect-error resolved by the pack config to ketcher-standalone's worker source
const start = () => (started ??= import('@ketcher-standalone-struct/indigoWorker'));

/** What `_indigo-worker-import-alias_` must export: ketcher-standalone calls this once per struct service. */
export function getIndigoWorker(): Worker {
  return {
    postMessage(message: unknown) {
      // Asynchronous, as a real worker is: the service registers its reply handler after posting.
      void start().then(() => indigoSelf.onmessage?.({ data: message }));
    },
    addEventListener(type: string, listener: Listener) {
      if (type === 'message') listeners.add(listener);
    },
    removeEventListener(type: string, listener: Listener) {
      if (type === 'message') listeners.delete(listener);
    },
    terminate() {
      listeners.clear();
    },
  } as unknown as Worker;
}
