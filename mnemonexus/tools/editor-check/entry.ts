import { ChemicalMimeType, KetSerializer, describeArrows, matchArrowSet } from 'ketcher-core';
import { setIndigoWasmSource } from '../../src/indigo/indigoModule';
import { indigoStructServiceProvider } from '../../src/indigo/structService';
import { BUILT_ENZYMES } from '../../src/enzymes';
import { describeAtom } from '../../src/enzymes/engine';
import { PUZZLES } from '../../src/puzzles';
import { adaptImportedExercise, type ImportedExercise } from '../../src/catalogue';
import type { KetcherArrowDescriptor } from '../../src/engine/arrows';
import { auditAnswer, editorStructFromKet, readEditorStruct } from '../../src/engine/drawn';
import { LESSONS } from '../../src/lessons';
import { buildLesson } from '../../src/lessons/kit';
import { checkPrediction } from '../../src/lessons/predict';
import { mix, puzzleFromKey, puzzleKey } from '../../src/practice/generate';
import { TEMPLATES } from '../../src/practice/templates';
import { allForms, bestForms, checkLewis, lewisKet } from '../../src/lewis/check';
import { LEWIS_SPECIES } from '../../src/lewis/species';

/** Runs in a browser: loads every enzyme document with the real editor code and compares it with the authoring model. */
(window as unknown as { runEditorCheck: () => unknown }).runEditorCheck = () => {
  const problems: string[] = [];
  let puzzles = 0, atoms = 0, arrows = 0;
  for (const built of BUILT_ENZYMES) {
    for (const step of built.steps) {
      puzzles++;
      const puzzle = step.puzzle;
      const here = puzzle.id;
      let struct;
      try {
        struct = new KetSerializer().deserializeMicromolecules(puzzle.document);
      } catch (error) {
        problems.push(`${here}: the document does not load: ${String(error)}`);
        continue;
      }
      struct.initHalfBonds();
      struct.initNeighbors();
      struct.setImplicitHydrogen();
      const ids = [...step.indexOf.keys()].sort((x, y) => step.indexOf.get(x)! - step.indexOf.get(y)!);
      if (struct.atoms.size !== ids.length) problems.push(`${here}: atom count ${struct.atoms.size} vs ${ids.length}`);
      if (struct.bonds.size !== step.start.bonds.length) problems.push(`${here}: bond count ${struct.bonds.size} vs ${step.start.bonds.length}`);
      ids.forEach((id, index) => {
        atoms++;
        const real = struct.atoms.get(index);
        const mine = describeAtom(step.start, id);
        if (!real) { problems.push(`${here}: no atom ${index} (${id})`); return; }
        if (real.label !== mine.atom.el) problems.push(`${here}: ${id} label ${real.label} vs ${mine.atom.el}`);
        if ((real.charge ?? 0) !== mine.charge) problems.push(`${here}: ${id} charge ${real.charge} vs ${mine.charge}`);
        if (real.badConn) problems.push(`${here}: ${id} is flagged as a bad valence by the editor`);
        if (real.implicitH !== mine.hydrogens) problems.push(`${here}: ${id} implicit H ${real.implicitH} vs model ${mine.hydrogens}`);
        if (real.valence !== mine.valence && mine.atom.el !== 'Zn' && mine.atom.el !== 'Mg') problems.push(`${here}: ${id} valence ${real.valence} vs model ${mine.valence}`);
        if (mine.atom.alias && real.alias !== mine.atom.alias) problems.push(`${here}: ${id} alias ${real.alias} vs ${mine.atom.alias}`);
      });
      // Put the answer arrows into the document as a solved mechanism and read them back with the editor's own code.
      const doc = JSON.parse(puzzle.document);
      const expected = puzzle.steps.flatMap((s) => [...s.expectedArrows]);
      for (const a of expected) doc.root.nodes.push(arrowNode(a as never));
      try {
        const solved = new KetSerializer().deserializeMicromolecules(JSON.stringify(doc));
        const described = describeArrows(solved);
        arrows += expected.length;
        if (described.length !== expected.length) problems.push(`${here}: ${described.length} arrows read back, ${expected.length} expected`);
        const match = matchArrowSet(described, [...expected]);
        if (!match.complete) problems.push(`${here}: the arrows do not read back as the answer (${JSON.stringify(match)})`);
      } catch (error) {
        problems.push(`${here}: solved document fails: ${String(error)}`);
      }
    }
  }
  return { puzzles, atoms, arrows, problems };
};

type ExpectedArrow = { kind?: string; source: Record<string, unknown> & { kind: string }; destination: unknown };

/** One answer arrow as a KET node, written the way the lesson kit writes it: a fishhook keeps its mode, and a radical
 * source its dot. */
function arrowNode(a: ExpectedArrow) {
  const data: Record<string, unknown> = { mode: a.kind === 'fishhook' ? 'fishhook-mechanism' : 'curly-mechanism', pos: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }], height: 0.25, height2: 0.25, autoRoute: true };
  if (a.source.kind === 'lone-pair') data.lpAttach = { atomId: a.source.atomId, pairIdx: a.source.pairIdx ?? 0 };
  else if (a.source.kind === 'radical') data.raAttach = { atomId: a.source.atomId, radicalIdx: 0 };
  else data.bdAttach = { bondId: a.source.bondId, side: a.source.side ?? 1 };
  data.destAttach = a.destination;
  return { type: 'arrow', data };
}

/** A puzzle document with its answer arrows drawn in, loaded with the real editor code (implicit hydrogens set). */
function solvedStruct(document: string, expected: readonly ExpectedArrow[]) {
  const doc = JSON.parse(document);
  for (const a of expected) doc.root.nodes.push(arrowNode(a));
  const struct = new KetSerializer().deserializeMicromolecules(JSON.stringify(doc));
  struct.initHalfBonds();
  struct.initNeighbors();
  struct.setImplicitHydrogen();
  return struct;
}

/**
 * Live legality on the editor's own structure: its atom and bond ids, its implicit hydrogens, its arrow descriptors.
 * Every guided answer must audit as legal; every imported step must get the same verdict as the unit tests' stand-in.
 */
(window as unknown as { runLegalityCheck: (imported: ImportedExercise[]) => unknown }).runLegalityCheck = (imported) => {
  const problems: string[] = [];
  const verdicts = new Map<string, number>();
  // Lessons: each step's answer is legal on the editor's own structure, every frame loads with the hydrogens the
  // engine computed, and the Predict answer, read back through the editor, is right.
  let lessonDocs = 0;
  for (const def of LESSONS) {
    const lesson = buildLesson(def);
    for (const puzzle of lesson.puzzles) {
      const struct = solvedStruct(puzzle.document, puzzle.steps[0].expectedArrows as never);
      const audit = auditAnswer(struct, describeArrows(struct) as unknown as KetcherArrowDescriptor[]);
      if (audit.verdict !== 'ok') problems.push(`lesson ${puzzle.id}: ${audit.verdict} (${'detail' in audit ? audit.detail : ''})`);
    }
    for (const [i, frame] of lesson.frames.entries()) {
      const struct = solvedStruct(frame.ket, []);
      const read = readEditorStruct(struct);
      const standIn = readEditorStruct(editorStructFromKet(JSON.parse(frame.ket).mol0));
      const theirs = [...struct.atoms.values()].map((atom) => atom.implicitH);
      const expected = 'structure' in standIn ? standIn.structure.atoms.map((atom) => atom.h) : [];
      if (!('structure' in read)) problems.push(`lesson ${def.id} frame ${i + 1}: the editor's structure does not read (${JSON.stringify(read).slice(0, 120)})`);
      else if (JSON.stringify(theirs) !== JSON.stringify(expected)) problems.push(`lesson ${def.id} frame ${i + 1}: editor hydrogens ${theirs} vs engine ${expected}`);
      lessonDocs++;
    }
    const answer = checkPrediction(solvedStruct(lesson.predict.answerKet, []), lesson.predict.expected);
    if (answer.verdict !== 'right') problems.push(`lesson ${def.id}: the Predict answer reads back as ${answer.verdict}: ${answer.message}`);
  }
  // Generated practice: 40 seeds per template, through the real editor (hydrogens as drawn, answer legal).
  for (const template of TEMPLATES) for (let seed = 1; seed <= 40; seed++) {
    const puzzle = puzzleFromKey(puzzleKey(template.id, mix(seed)));
    if (!puzzle) { problems.push(`${template.id} seed ${seed}: does not build`); continue; }
    const struct = solvedStruct(puzzle.document, puzzle.steps[0].expectedArrows as never);
    const audit = auditAnswer(struct, describeArrows(struct) as unknown as KetcherArrowDescriptor[]);
    if (audit.verdict !== 'ok') problems.push(`${puzzle.title}: ${audit.verdict} (${'detail' in audit ? audit.detail : ''})`);
    const standIn = readEditorStruct(editorStructFromKet(JSON.parse(puzzle.document).mol0));
    const theirs = [...struct.atoms.values()].map((atom) => atom.implicitH);
    const expected = 'structure' in standIn ? standIn.structure.atoms.map((atom) => atom.h) : [];
    if (JSON.stringify(theirs) !== JSON.stringify(expected)) problems.push(`${puzzle.title}: editor hydrogens ${theirs} vs engine ${expected}`);
    lessonDocs++;
  }
  for (const puzzle of PUZZLES) {
    const struct = solvedStruct(puzzle.document, puzzle.steps.flatMap((s) => [...s.expectedArrows]) as never);
    const audit = auditAnswer(struct, describeArrows(struct) as unknown as KetcherArrowDescriptor[]);
    if (audit.verdict !== 'ok') problems.push(`guided ${puzzle.id}: ${audit.verdict} (${'detail' in audit ? audit.detail : ''})`);
  }
  // Draw & check: every complete-octet form of every species, loaded in the real editor, is right (fewest charges) or
  // close (more), and the bare skeleton is wrong except where it is already the answer.
  let lewis = 0;
  for (const species of LEWIS_SPECIES) {
    const best = bestForms(species);
    for (const form of allForms(species)) {
      const verdict = checkLewis(solvedStruct(lewisKet(species, form), []), species, best).verdict;
      const want = form.score === best[0].score ? 'right' : 'close';
      if (verdict !== want) problems.push(`lewis ${species.id} form ${form.orders.join('')}: ${verdict}, not ${want}`);
      lewis++;
    }
    const bare = checkLewis(solvedStruct(lewisKet(species), []), species, best).verdict;
    if (bare !== (species.id === 'bf3' ? 'right' : 'wrong')) problems.push(`lewis ${species.id} skeleton: ${bare}`);
    lewis++;
  }
  for (const record of imported) {
    const puzzle = adaptImportedExercise(record);
    if (!puzzle) continue;
    const expected = puzzle.steps[0].expectedArrows;
    let struct;
    try { struct = solvedStruct(record.document, expected as never); } catch (error) { problems.push(`${record.id}: does not load: ${String(error)}`); continue; }
    const real = auditAnswer(struct, describeArrows(struct) as unknown as KetcherArrowDescriptor[]);
    const standIn = auditAnswer(editorStructFromKet(JSON.parse(record.document).mol0), expected as unknown as KetcherArrowDescriptor[]);
    verdicts.set(real.verdict, (verdicts.get(real.verdict) ?? 0) + 1);
    if (real.verdict !== standIn.verdict) problems.push(`${record.id}: editor says ${real.verdict} (${'detail' in real ? real.detail : ''}), stand-in says ${standIn.verdict}`);
  }
  return { guided: PUZZLES.length, lessons: lessonDocs, lewis, imported: Object.fromEntries(verdicts), problems };
};

/**
 * Indigo as the pack runs it: Ketcher's standalone service over the in-thread worker, with the WebAssembly handed over
 * as bytes. Converts a SMILES with a stereocentre to KET and back, lays out phenol, labels the centre R or S, and times
 * the first call (which loads Indigo) against a later one.
 */
(window as unknown as { runIndigoCheck: (wasmUrl: string) => Promise<unknown> }).runIndigoCheck = async (wasmUrl) => {
  setIndigoWasmSource(() => fetch(wasmUrl).then((response) => response.arrayBuffer()));
  const service = indigoStructServiceProvider.createStructService({});
  const startedAt = performance.now();
  const info = await service.info();
  const loadMs = Math.round(performance.now() - startedAt);
  // From SMILES with a layout: a KET without coordinates cannot carry the wedge that holds the stereocentre.
  const ket = await service.layout({ struct: 'C[C@H](N)C(=O)O', output_format: ChemicalMimeType.KET });
  const smiles = await service.convert({ struct: ket.struct, output_format: ChemicalMimeType.DaylightSmiles });
  const cip = await service.calculateCip({ struct: ket.struct, output_format: ChemicalMimeType.KET });
  const callAt = performance.now();
  const layout = await service.layout({ struct: 'Oc1ccccc1', output_format: ChemicalMimeType.KET });
  const callMs = Math.round(performance.now() - callAt);
  const cipLabels = [...cip.struct.matchAll(/"cip"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  const laidOut = JSON.parse(layout.struct).mol0?.atoms?.length ?? 0;
  return { version: info.indigoVersion, available: info.isAvailable, loadMs, callMs, smiles: smiles.struct, cipLabels, laidOut };
};
