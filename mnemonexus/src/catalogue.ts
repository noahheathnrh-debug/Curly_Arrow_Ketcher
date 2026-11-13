import type { MechanismArrowDescriptor, MechanismPuzzle } from 'ketcher-core';
import type { KetcherArrowDescriptor } from './engine/arrows';
import { auditAnswer, editorStructFromKet } from './engine/drawn';

export interface ImportedExercise {
  id: string; title: string; difficulty: NonNullable<MechanismPuzzle['difficulty']>;
  tags: string[]; prompt: string; document: string;
  expected: { electrons: number; from: End; to: End }[];
  source: { app: string; puzzle: number; step: number };
}
interface End { kind: 'atom' | 'lone-pair' | 'bond'; atom?: number; bond?: number }
export interface Level {
  id: string; title: string; puzzles: MechanismPuzzle[];
  collection: 'Guided' | 'Imported' | 'Enzymes'; withheldSteps: number;
}

/** Keep the import's KET and coordinates intact. Adapt semantic anchors only.
 * The old import did not retain which end migrates for bond-to-external-atom
 * arrows. Do not manufacture that missing answer or silently skip such steps.
 */
export function adaptImportedExercise(raw: ImportedExercise): MechanismPuzzle | null {
  try {
    const document = JSON.parse(raw.document);
    const molecule = document.mol0;
    if (!molecule || !Array.isArray(molecule.atoms) || !Array.isArray(molecule.bonds)) return null;
    const atomExists = (id: number | undefined): id is number => Number.isInteger(id) && id! >= 0 && id! < molecule.atoms.length;
    const bondExists = (id: number | undefined): id is number => Number.isInteger(id) && id! >= 0 && id! < molecule.bonds.length;
    const expectedArrows: MechanismArrowDescriptor[] = [];
    for (const arrow of raw.expected) {
      if (arrow.electrons !== 2) return null;
      let source: MechanismArrowDescriptor['source'];
      if (arrow.from.kind === 'bond' && bondExists(arrow.from.bond)) {
        source = { kind: 'bond', bondId: arrow.from.bond };
      } else if (arrow.from.kind !== 'bond' && atomExists(arrow.from.atom)) {
        source = { kind: 'lone-pair', atomId: arrow.from.atom, pairIdx: 0 };
      } else return null;
      let destination: MechanismArrowDescriptor['destination'];
      if (arrow.to.kind === 'bond' && bondExists(arrow.to.bond)) {
        destination = { kind: 'bond', bondId: arrow.to.bond };
      } else if (arrow.to.kind !== 'bond' && atomExists(arrow.to.atom)) {
        if (source.kind === 'bond') {
          if (!molecule.bonds[source.bondId].atoms.includes(arrow.to.atom)) return null;
          destination = { kind: 'atom', atomId: arrow.to.atom };
        } else {
          if (source.atomId === arrow.to.atom) return null;
          destination = { kind: 'new-bond', atomId1: source.atomId, atomId2: arrow.to.atom };
        }
      } else return null;
      expectedArrows.push({ kind: 'curly', source, destination });
    }
    if (!expectedArrows.length) return null;
    return {
      schemaVersion: 1, id: raw.id, title: raw.title, difficulty: raw.difficulty,
      tags: raw.tags, document: raw.document,
      steps: [{ prompt: raw.prompt, expectedArrows, profile: 'puzzle-arrow-only' }],
      provenance: {
        source: `${raw.source.app} puzzle ${raw.source.puzzle}, step ${raw.source.step}`,
        note: 'Legacy importer checked next-step connectivity. Current anchor format adapted; not independently reviewed chemistry.',
      },
    };
  } catch { return null; }
}

/**
 * The chemistry engine's verdict on a recovered step: its structure must obey valence rules and its answer must be
 * legal electron movement. Steps the engine cannot model (metals in bonds, R groups, aromatic bonds) pass, judged by
 * their answer key alone; steps it proves wrong (a five-bonded carbon, electrons jumping across a ring) do not.
 */
export function engineVetted(raw: ImportedExercise, puzzle: MechanismPuzzle): boolean {
  try {
    const answer = puzzle.steps.flatMap((s) => s.expectedArrows) as unknown as KetcherArrowDescriptor[];
    const audit = auditAnswer(editorStructFromKet(JSON.parse(raw.document).mol0), answer);
    return audit.verdict === 'ok' || audit.verdict === 'outside';
  } catch { return false; }
}

export function buildLevels(guided: readonly MechanismPuzzle[], imported: readonly ImportedExercise[], enzymes: readonly Level[] = []): Level[] {
  const levels: Level[] = [
    ...guided.map((puzzle): Level => ({ id: puzzle.id, title: puzzle.title, puzzles: [puzzle], collection: 'Guided', withheldSteps: 0 })),
    // Enzyme mechanisms are authored here, not recovered, so they are never withheld; they sit before the imported levels.
    ...enzymes,
  ];
  const groups = new Map<number, ImportedExercise[]>();
  for (const puzzle of imported) {
    const group = groups.get(puzzle.source.puzzle) ?? [];
    group.push(puzzle); groups.set(puzzle.source.puzzle, group);
  }
  for (const [number, records] of [...groups].sort(([a], [b]) => a - b)) {
    records.sort((a, b) => a.source.step - b.source.step);
    if (records.some((record, index) => record.source.step !== index + 1)) continue;
    const puzzles = records.map((record) => {
      const puzzle = adaptImportedExercise(record);
      return puzzle && engineVetted(record, puzzle) ? puzzle : null;
    }).filter((p): p is MechanismPuzzle => p !== null);
    // Hold back levels with gaps, incompatible steps, or a step the engine proves
    // wrong. The import cannot prove an absent final step; describe offered
    // content as recovered exercises.
    if (puzzles.length !== records.length) continue;
    levels.push({ id: `ocra-level-${number}`, title: `Level ${number} · ${puzzles[0].title}`,
      puzzles, collection: 'Imported', withheldSteps: 0 });
  }
  return levels;
}
