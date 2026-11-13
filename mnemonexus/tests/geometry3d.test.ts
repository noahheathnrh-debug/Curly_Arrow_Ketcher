import { describe, expect, test } from 'bun:test';
import { buildGeometry, type Geometry } from '../src/engine/geometry3d';
import { buildStructure, type StructureSpec } from '../src/engine/molecule';

/** VSEPR shapes built from the graph: the textbook set, a flat alkene, a puckered ring. */

const build = (spec: StructureSpec) => {
  const { structure, issues } = buildStructure(spec, 'structure', { expandedOctets: true });
  if (!structure) throw new Error(issues.map((i) => i.message).join(' '));
  return structure;
};
/** A central atom with ligands, the way the atoms family lists molecules; the charge sits on the centre. */
const centred = (central: string, ligands: [string, number][], charge = 0, h = 0) => build({
  atoms: [{ id: 'X', el: central, charge, h }, ...ligands.map(([el], i) => ({ id: `L${i + 1}`, el }))],
  bonds: ligands.map(([, order], i) => ({ a: 'X', b: `L${i + 1}`, order })),
});
const centre = (g: Geometry, id = 'X') => g.centres.find((c) => c.atom === id)!;
const near = (values: number[], target: number, tolerance: number) => values.filter((v) => Math.abs(v - target) <= tolerance).length;
const shapeOf = (s: ReturnType<typeof build>) => { const g = buildGeometry(s); return { g, c: centre(g) }; };

describe('VSEPR shapes', () => {
  test('methane is tetrahedral at 109.5°', () => {
    const { c } = shapeOf(build({ atoms: [{ id: 'X', el: 'C', h: 4 }], bonds: [] }));
    expect(c.shape).toBe('tetrahedral');
    expect(near(c.angles, 109.5, 1.5)).toBe(6);
  });
  test('ammonia is trigonal pyramidal, its angle squeezed by the lone pair', () => {
    const { c } = shapeOf(build({ atoms: [{ id: 'X', el: 'N', h: 3 }], bonds: [] }));
    expect(c.shape).toBe('trigonal pyramidal');
    for (const a of c.angles) expect(a).toBeGreaterThan(102), expect(a).toBeLessThan(109.5);
  });
  test('water is bent, squeezed more by two lone pairs', () => {
    const { c } = shapeOf(build({ atoms: [{ id: 'X', el: 'O', h: 2 }], bonds: [] }));
    expect(c.shape).toBe('bent');
    expect(c.angles[0]).toBeGreaterThan(99);
    expect(c.angles[0]).toBeLessThan(108);
  });
  test('carbon dioxide is linear', () => {
    const { c } = shapeOf(centred('C', [['O', 2], ['O', 2]]));
    expect(c.shape).toBe('linear');
    expect(c.angles[0]).toBeGreaterThan(178);
  });
  test('boron trifluoride is trigonal planar at 120°', () => {
    const { c } = shapeOf(centred('B', [['F', 1], ['F', 1], ['F', 1]]));
    expect(c.shape).toBe('trigonal planar');
    expect(near(c.angles, 120, 1.5)).toBe(3);
  });
  test('sulfur hexafluoride is octahedral', () => {
    const { c } = shapeOf(centred('S', Array.from({ length: 6 }, () => ['F', 1] as [string, number])));
    expect(c.shape).toBe('octahedral');
    expect(near(c.angles, 90, 3)).toBe(12);
    expect(near(c.angles, 180, 3)).toBe(3);
  });
  test('phosphorus pentachloride is a trigonal bipyramid', () => {
    const { c } = shapeOf(centred('P', Array.from({ length: 5 }, () => ['Cl', 1] as [string, number])));
    expect(c.shape).toBe('trigonal bipyramidal');
    expect(near(c.angles, 90, 4)).toBe(6);
    expect(near(c.angles, 120, 4)).toBe(3);
    expect(near(c.angles, 180, 4)).toBe(1);
  });
  test('sulfur tetrafluoride is a seesaw: the lone pair sits in the equator', () => {
    const { c } = shapeOf(centred('S', Array.from({ length: 4 }, () => ['F', 1] as [string, number])));
    expect(c.shape).toBe('seesaw');
    expect(Math.max(...c.angles)).toBeGreaterThan(160);
    expect(Math.max(...c.angles)).toBeLessThan(180);
  });
  test('chlorine trifluoride is T-shaped', () => {
    const { c } = shapeOf(centred('Cl', [['F', 1], ['F', 1], ['F', 1]]));
    expect(c.shape).toBe('T-shaped');
    expect(Math.max(...c.angles)).toBeGreaterThan(165);
    expect(near(c.angles, 88, 5)).toBe(2);
  });
  test('xenon difluoride is linear: three lone pairs round the equator', () => {
    const { c } = shapeOf(centred('Xe', [['F', 1], ['F', 1]]));
    expect(c.shape).toBe('linear');
    expect(c.angles[0]).toBeGreaterThan(176);
  });
  test('xenon tetrafluoride is square planar: the two lone pairs opposite', () => {
    const { c } = shapeOf(centred('Xe', Array.from({ length: 4 }, () => ['F', 1] as [string, number])));
    expect(c.shape).toBe('square planar');
    expect(near(c.angles, 90, 3)).toBe(4);
    expect(near(c.angles, 180, 3)).toBe(2);
  });
  test('the tetrachloroiodate ion is square planar too', () => {
    const { c } = shapeOf(centred('I', Array.from({ length: 4 }, () => ['Cl', 1] as [string, number]), -1));
    expect(c.shape).toBe('square planar');
  });
});

describe('beyond one centre', () => {
  const planeDeviation = (g: Geometry, ids?: string[]) => {
    const pts = g.atoms.filter((a) => !ids || ids.includes(a.id)).map((a) => a.p);
    // Normal of the best plane through the points, from three far-apart ones (good enough for a flat check).
    const [a, b, c] = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]];
    const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    const ln = Math.hypot(n.x, n.y, n.z) || 1;
    return Math.max(...pts.map((p) => Math.abs(((p.x - a.x) * n.x + (p.y - a.y) * n.y + (p.z - a.z) * n.z) / ln)));
  };

  test('ethene is flat: all six atoms in one plane', () => {
    const g = buildGeometry(build({ atoms: [{ id: 'C1', el: 'C', h: 2 }, { id: 'C2', el: 'C', h: 2 }], bonds: [{ a: 'C1', b: 'C2', order: 2 }] }));
    expect(g.atoms).toHaveLength(6);
    expect(planeDeviation(g)).toBeLessThan(0.08);
    expect(near(g.centres.flatMap((c) => c.angles), 120, 4)).toBe(6);
  });

  test('cyclohexane puckers: its ring is not flat and its angles are near tetrahedral', () => {
    const ring = Array.from({ length: 6 }, (_, i) => `C${i + 1}`);
    const coords = Object.fromEntries(ring.map((id, i) => [id, { x: Math.cos((i * Math.PI) / 3), y: Math.sin((i * Math.PI) / 3) }]));
    const g = buildGeometry(build({ atoms: ring.map((id) => ({ id, el: 'C', h: 2 })), bonds: ring.map((id, i) => ({ a: id, b: ring[(i + 1) % 6], order: 1 })) }), { coords });
    expect(planeDeviation(g, ring)).toBeGreaterThan(0.2);
    const ccc = g.centres.map((c) => c.angles).flat();
    expect(Math.min(...ccc)).toBeGreaterThan(100);
    expect(Math.max(...ccc)).toBeLessThan(118);
  });

  test('a drawn E alkene stays E: the two methyls end up across the double bond', () => {
    // (E)-but-2-ene drawn as a zigzag.
    const atoms = [{ id: 'Ca', el: 'C', h: 3 }, { id: 'C1', el: 'C', h: 1 }, { id: 'C2', el: 'C', h: 1 }, { id: 'Cb', el: 'C', h: 3 }];
    const coords = { Ca: { x: 0, y: 0 }, C1: { x: 0.87, y: 0.5 }, C2: { x: 1.73, y: 0 }, Cb: { x: 2.6, y: 0.5 } };
    const g = buildGeometry(build({ atoms, bonds: [{ a: 'Ca', b: 'C1', order: 1 }, { a: 'C1', b: 'C2', order: 2 }, { a: 'C2', b: 'Cb', order: 1 }] }), { coords });
    const p = (id: string) => g.atoms.find((a) => a.id === id)!.p;
    const d = Math.hypot(p('Ca').x - p('Cb').x, p('Ca').y - p('Cb').y, p('Ca').z - p('Cb').z);
    expect(d).toBeGreaterThan(3.5); // trans; cis would be about 3.0
  });

  test('a drawn Z alkene stays Z', () => {
    const atoms = [{ id: 'Ca', el: 'C', h: 3 }, { id: 'C1', el: 'C', h: 1 }, { id: 'C2', el: 'C', h: 1 }, { id: 'Cb', el: 'C', h: 3 }];
    const coords = { Ca: { x: 0, y: 0 }, C1: { x: 0.87, y: 0.5 }, C2: { x: 1.87, y: 0.5 }, Cb: { x: 2.73, y: 0 } };
    for (const seed of [1, 2, 3]) {
      const g = buildGeometry(build({ atoms, bonds: [{ a: 'Ca', b: 'C1', order: 1 }, { a: 'C1', b: 'C2', order: 2 }, { a: 'C2', b: 'Cb', order: 1 }] }), { coords, seed });
      const p = (id: string) => g.atoms.find((a) => a.id === id)!.p;
      expect(Math.hypot(p('Ca').x - p('Cb').x, p('Ca').y - p('Cb').y, p('Ca').z - p('Cb').z)).toBeLessThan(3.3);
    }
  });

  test('the same seed builds the same shape', () => {
    const s = build({ atoms: [{ id: 'X', el: 'N', h: 3 }], bonds: [] });
    expect(buildGeometry(s, { seed: 7 })).toEqual(buildGeometry(s, { seed: 7 }));
  });

  test('expanded octets are for shapes only: mechanisms still refuse ten electrons on chlorine', () => {
    const spec = { atoms: [{ id: 'X', el: 'Cl' }, { id: 'F1', el: 'F' }, { id: 'F2', el: 'F' }, { id: 'F3', el: 'F' }], bonds: [1, 2, 3].map((i) => ({ a: 'X', b: `F${i}`, order: 1 })) };
    expect(buildStructure(spec).issues.map((i) => i.code)).toContain('octet-exceeded');
    expect(buildStructure(spec, 'structure', { expandedOctets: true }).structure).toBeDefined();
  });
});
