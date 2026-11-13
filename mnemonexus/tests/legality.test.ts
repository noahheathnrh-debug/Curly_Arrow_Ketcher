import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error a plain .mjs helper shared with the Vite configs
import { importedCorpusPath } from '../privateContent.mjs';
import { adaptImportedExercise, buildLevels, type ImportedExercise } from '../src/catalogue';
import type { KetcherArrowDescriptor } from '../src/engine/arrows';
import { auditAnswer, checkDrawnArrows, editorStructFromKet } from '../src/engine/drawn';

/**
 * Live legality, checked against real answers: a correct answer must never be refused, and a wrong arrow must be
 * refused with a reason a learner can read. The editor is stood in for by its struct shape, built from the KET the
 * editor loads (atom and bond ids are KET indices for these single-molecule documents).
 */

type Ket = { root: { nodes: Record<string, unknown>[] }; mol0: { atoms: Record<string, unknown>[]; bonds: { type: number; atoms: number[] }[] } };

const editorStruct = (doc: Ket) => editorStructFromKet(doc.mol0);

/** The solved arrows a content KET carries, as the editor's `describeArrows` would report them. */
function drawnArrows(doc: Ket): KetcherArrowDescriptor[] {
  return doc.root.nodes.filter((n) => n.type === 'arrow').map((n) => {
    const d = n.data as Record<string, any>;
    const source = d.lpAttach ? { kind: 'lone-pair' as const, atomId: d.lpAttach.atomId }
      : d.raAttach ? { kind: 'radical' as const, atomId: d.raAttach.atomId }
        : { kind: 'bond' as const, bondId: d.bdAttach.bondId };
    return { kind: d.mode === 'fishhook-mechanism' ? 'fishhook' : 'curly', source, destination: d.destAttach };
  });
}

const contentDir = join(import.meta.dir, '../src/content');
const content = readdirSync(contentDir).filter((f) => f.endsWith('.ket'))
  .map((f) => ({ name: f, doc: JSON.parse(readFileSync(join(contentDir, f), 'utf8')) as Ket }));

describe('live legality on the guided mechanisms', () => {
  test.each(content.map((c) => [c.name, c.doc] as const))('%s: the full answer is legal and ends legal', (_name, doc) => {
    const check = checkDrawnArrows(editorStruct(doc), drawnArrows(doc));
    expect(check).not.toBeNull();
    expect(check!.refused).toBeUndefined();
    expect(check!.pending).toEqual([]);
  });

  const sn2 = content.find((c) => c.name.includes('sn2'))!.doc;
  test('an arrow from carbon, which has no lone pair, is refused at once with the rule', () => {
    const check = checkDrawnArrows(editorStruct(sn2), [{ kind: 'curly', source: { kind: 'lone-pair', atomId: 0 }, destination: { kind: 'atom', atomId: 5 } }]);
    expect(check!.refused).toMatchObject({ index: 0, code: 'arrow-start-no-lone-pair', atoms: ['a0', 'a5'] });
    expect(check!.refused!.message).toContain('this carbon');
    expect(check!.refused!.message).not.toMatch(/\ba\d+\b/);
  });

  test('half an answer is not refused; the octet it breaks is kept as pending, to explain a wrong finish', () => {
    const [attack] = drawnArrows(sn2);
    const check = checkDrawnArrows(editorStruct(sn2), [attack]);
    expect(check!.refused).toBeUndefined();
    expect(check!.pending.map((p) => p.code)).toEqual(['octet-exceeded']);
    expect(check!.pending[0].message).toContain('10 electrons');
  });

  test('a fishhook drawn for a polar step is refused: one electron cannot leave a lone pair', () => {
    const [attack, leave] = drawnArrows(sn2);
    const check = checkDrawnArrows(editorStruct(sn2), [{ ...attack, kind: 'fishhook' }, leave]);
    expect(check!.refused?.code).toBe('fishhook-start-no-radical');
  });

  test('a drawing outside the engine (an aromatic bond) is left to the answer key', () => {
    const doc = structuredClone(sn2);
    doc.mol0.bonds[0].type = 4;
    expect(checkDrawnArrows(editorStruct(doc), drawnArrows(doc))).toBeNull();
  });
});

const raw: ImportedExercise[] = importedCorpusPath ? JSON.parse(readFileSync(importedCorpusPath, 'utf8')) : [];
describe.skipIf(raw.length === 0)('live legality on the imported corpus (a hostile pass)', () => {
  const audits = raw.map((record) => {
    const puzzle = adaptImportedExercise(record);
    const answer = puzzle?.steps[0].expectedArrows as unknown as KetcherArrowDescriptor[];
    return { id: record.id, audit: puzzle ? auditAnswer(editorStruct(JSON.parse(record.document)), answer) : null };
  });

  test('the engine finds the recovered steps that are chemically wrong', () => {
    const tally = new Map<string, number>();
    for (const { audit } of audits) if (audit) tally.set(audit.verdict, (tally.get(audit.verdict) ?? 0) + 1);
    console.log(`imported, every adaptable step: ${[...tally].map(([k, v]) => `${v} ${k}`).join('; ')}`);
    for (const { id, audit } of audits) if (audit && audit.verdict !== 'ok' && audit.verdict !== 'outside') console.log(`  ${id}: ${audit.verdict} (${audit.detail})`);
    // Electrons jumping across the ring to a bond the C-H bond does not touch.
    expect(audits.find((a) => a.id === 'ocra-792-3')!.audit).toMatchObject({ verdict: 'refused' });
  });

  test('no offered step is one the engine proves wrong', () => {
    const offered = new Set(buildLevels([], raw).flatMap((l) => l.puzzles.map((p) => p.id)));
    expect(offered.size).toBeGreaterThan(400);
    const bad = audits.filter((a) => offered.has(a.id) && a.audit && a.audit.verdict !== 'ok' && a.audit.verdict !== 'outside');
    expect(bad).toEqual([]);
  });
});
