# Serialization & Formats

> Reading and writing chemical structures in ~25 text formats.

Cross-cutting deep-dive. Complements the format table in [../domain.md](../domain.md#supported-chemical-formats).

## Responsibility

Convert between the internal model (`Struct` / drawing-entities manager) and external text formats. Three layers:

1. **Serializers** — pure in-browser conversion for KET, MOL, and SDF. No server.
2. **Formatters** — a strategy layer that picks local serialization or routes through Indigo per format.
3. **StructService** — the Indigo backend abstraction (remote HTTP or standalone WASM), with a thin convenience wrapper on top.

**End-to-end flow:** raw text → format identification → formatter selection → a local formatter (KET / MOL V2000) **or** the server formatter → Indigo convert/layout returning KET → KET deserialization → `Struct` / drawing-entities manager. Serialization is the reverse. KET is the universal interchange format.

## 1. Serializers

All serializers share a common interface: a `deserialize(content)` that returns the model and a `serialize(model)` that returns text.

### KET

The **central** serializer — the only one that handles **both** micro `Struct` and macro monomers (the drawing-entities manager) in one document.

- **Micro:** deserialization parses the JSON, validates it against a schema, and dispatches each node to the matching "from KET" converter; serialization prepares the structure and emits each node via its "to KET" converter, tagging the document with a KET version.
- **Macro:** parse-and-validate, then deserialize macromolecules entities converting into drawing entities (there is also a path to deserialize straight into a `Struct`); serialization emits nodes, connections, and templates.

#### Stable identity for mechanism-arrow anchors

Atoms and bonds are written to KET **positionally** — a molecule node lists them in order, with no id of their own — and one node is emitted per fragment. Saving also re-keys the atom pool several times over: once per fragment on the way into the drawing-entity model, again when those fragments are merged back into a fresh structure, and again when each fragment is cloned out for writing. Pool ids are monotonic and never reused, so deleting an atom leaves a hole that a reload closes up.

Mechanism arrows anchor to atoms and bonds *by id*, and none of those hops rewrite the anchors. A structure whose fragments happen to be numbered contiguously survives by luck; interleaved ids (draw a nucleophile, then a substrate, then extend the nucleophile) or a deletion do not.

So each atom and bond an arrow references carries an explicit **stable id**, and each arrow carries a second copy of its anchors expressed in those ids. The ids are stamped once, on the caller's structure, before anything clones it; the anchors are recomputed from them in a single pass once a file has been fully read and the ids are final.

Two properties are deliberate:

- **Opt-in.** Only referenced atoms and bonds are stamped, so a structure with no mechanism arrows serializes byte-for-byte as before, and an arrow's identifier is written only for mechanism arrows.
- **Degrades quietly.** A file written before stable ids existed has only the numeric anchors and loads exactly as it used to. An anchor that cannot be resolved keeps its stored number rather than being dropped — a possibly-wrong anchor is better than silently turning a curly arrow back into a bare curve.

Lone-pair and radical *indices* within an atom are a separate matter and are **not** stabilised: they are positions in a recomputed layout, so they hold only while the atom's valence, charge, neighbour geometry and hydrogen side are unchanged.

### MOL

A mol serializer on ketcher side handles **only V2000**. **V3000** is handled by Indigo.

### SDF

Splits records on the record separator, parses each MOL block via the MOL serializer, and parses the property blocks into associated structure data.

## 2. Formatters

A formatter exposes async methods to get a string from a structure and a structure from a string. A factory chooses the implementation per format:

- **KET** → local KET formatter.
- **MOL V2000** → local formatter — unless query properties are used, in which case it falls back to the server formatter.
- **Everything else** (V3000, SMILES/SMARTS variants, RXN, InChI, CML, CDX/CDXML, SDF, FASTA, sequence, IDT, HELM, BILN, AxoLabs, …) → the server formatter (Indigo).

So only **KET and plain MOL V2000** are local; all other formats require Indigo.

The server formatter serializes to KET, calls Indigo convert or layout (chosen by whether the format carries coordinates).It also deserializes the KET result returned by Indigo. A format-identification step sniffs raw input (JSON → KET, reaction marker → RXN, version markers → MOL, InChI prefix → InChI, etc.). A format-properties table maps each supported format to its MIME type, extensions, and Indigo options.

## 3. StructService

The service interface covers the full Indigo surface: convert, layout, clean, aromatize/dearomatize, CIP calculation, automap, check, calculate, recognize, InChI key, image generation, explicit-hydrogen toggling, macromolecule property calculation, and info. A MIME-type enum maps formats to MIME strings.

A provider abstraction exposes a mode (`standalone` or `remote`) and a factory that creates a service:

- **Remote** — HTTP requests to Indigo endpoints. A shared helper supplies the standard Indigo option set (also used by standalone).
- **Standalone** — runs Indigo WASM in a worker and satisfies the same interface. See [ketcher-standalone](./ketcher-standalone.md).

**Wiring:** the Ketcher builder asks the provider to create a service, constructs the top-level Ketcher instance with that service and a formatter factory, and records which mode is active.

## Assumptions & constraints

- KET is the interchange format between the model and Indigo for all non-KET/non-MOL-V2000 formats.
- Coordinate systems differ between browser and chemistry conventions; the KET serializer flips the Y-axis.
