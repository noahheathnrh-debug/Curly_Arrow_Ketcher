/**
 * Stands in for Ketcher's monomer library.
 *
 * `ketcher-core` lazily imports `application/editor/data/monomers.ket` — 3.4 MB
 * of peptide, RNA and DNA templates — the moment the editor initialises. A
 * mechanism exercise never opens macromolecules mode, so none of it is ever
 * read, but a single-file pack bundle has nowhere to defer it to and the pack
 * code cap is 8 MB of *uncompressed* bytes.
 *
 * An empty but structurally valid KET document keeps the loading path working:
 * the library parses, finds nothing, and the monomer panel is empty. Anything
 * that genuinely needed a monomer would find it missing rather than crash, which
 * is the right failure for a build that deliberately left them out.
 */
export default JSON.stringify({
  root: { nodes: [], connections: [], templates: [] },
})
