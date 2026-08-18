import fs from 'fs';
import path from 'path';
import { KetSerializer } from 'domain/serializers';
import { RxnArrow, RxnArrowMode } from 'domain/entities';

/**
 * Guards the committed Playwright fixtures.
 *
 * They are hand-authored JSON (by `generate.cjs`), so a typo in an anchor would
 * otherwise only surface as a puzzling screenshot diff. Parsing them here also
 * exercises the compiled KET schema, which had to learn the mechanism-arrow
 * fields.
 */

const FIXTURE_DIR = path.resolve(
  __dirname,
  '../../../../../../ketcher-autotests/tests/test-data/KET/Mechanism-Arrows',
);

const EXPECTED_ARROW_COUNT: Record<string, number> = {
  'mechanism-carbocation-attack.ket': 1,
  'mechanism-sn2-backside.ket': 2,
  'mechanism-carbonyl-addition.ket': 2,
  'mechanism-hydride-shift.ket': 1,
  'mechanism-allyl-resonance.ket': 1,
  'mechanism-proton-transfer.ket': 2,
};

const ket = new KetSerializer();

describe('mechanism arrow visual-test fixtures', () => {
  const names = Object.keys(EXPECTED_ARROW_COUNT);

  it('has every fixture on disk', () => {
    const present = fs
      .readdirSync(FIXTURE_DIR)
      .filter((name) => name.endsWith('.ket'))
      .sort();
    expect(present).toEqual([...names].sort());
  });

  it.each(names)('%s parses into the expected structure', (name) => {
    const content = fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
    const struct = ket.deserialize(content);

    expect(struct.atoms.size).toBeGreaterThan(0);
    expect(struct.bonds.size).toBeGreaterThan(0);
    expect(struct.rxnArrows.size).toBe(EXPECTED_ARROW_COUNT[name]);
  });

  it.each(names)('%s keeps its mechanism anchors through parsing', (name) => {
    const content = fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
    const struct = ket.deserialize(content);

    for (const arrow of struct.rxnArrows.values()) {
      expect(RxnArrow.isMechanism(arrow)).toBe(true);
      expect(arrow.mode).toBe(RxnArrowMode.CurlyMechanism);

      // Every fixture arrow must be routable: a semantic source, a semantic
      // destination, and no manual curve override.
      const hasSource = Boolean(
        arrow.lpAttach ?? arrow.raAttach ?? arrow.bdAttach,
      );
      expect(hasSource).toBe(true);
      expect(arrow.destAttach).toBeDefined();
      expect(arrow.autoRoute).toBe(true);
    }
  });

  it.each(names)('%s references only atoms and bonds that exist', (name) => {
    const content = fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
    const struct = ket.deserialize(content);

    const atomExists = (id: number) =>
      expect(struct.atoms.get(id)).toBeDefined();
    const bondExists = (id: number) =>
      expect(struct.bonds.get(id)).toBeDefined();

    for (const arrow of struct.rxnArrows.values()) {
      if (arrow.lpAttach) atomExists(arrow.lpAttach.atomId);
      if (arrow.raAttach) atomExists(arrow.raAttach.atomId);
      if (arrow.bdAttach) bondExists(arrow.bdAttach.bondId);

      const destination = arrow.destAttach;
      if (destination?.kind === 'atom') atomExists(destination.atomId);
      if (destination?.kind === 'bond') bondExists(destination.bondId);
      if (destination?.kind === 'new-bond') {
        atomExists(destination.atomId1);
        atomExists(destination.atomId2);
      }
    }
  });
});
