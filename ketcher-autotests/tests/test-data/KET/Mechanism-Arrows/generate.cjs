/**
 * Emits the six mechanism visual-test fixtures as .ket files.
 *
 * Coordinates are written in the chemistry convention (+y up); the KET reader
 * negates y on load. Arrows carry only their semantic anchors and autoRoute:
 * the curve itself is deliberately left for the app's router to compute, so the
 * Playwright screenshots exercise the live routing path rather than a value
 * baked in here.
 */
const fs = require('fs');
const path = require('path');

// Regenerate with:  node generate.cjs .
const outDir = process.argv[2] ?? __dirname;
fs.mkdirSync(outDir, { recursive: true });

// Shift everything into positive canvas territory so it lands on screen.
const OX = 8;
const OY = -6;

function molecule(atoms, bonds) {
  return {
    type: 'molecule',
    atoms: atoms.map((a) => {
      const atom = { label: a.label, location: [a.x + OX, a.y + OY, 0] };
      if (a.charge) atom.charge = a.charge;
      if (a.radical) atom.radical = a.radical;
      return atom;
    }),
    bonds: bonds.map((b) => {
      const bond = { type: b.type ?? 1, atoms: [b.a, b.b] };
      if (b.stereo) bond.stereo = b.stereo;
      return bond;
    }),
  };
}

function arrow(from, to, data) {
  return {
    type: 'arrow',
    data: {
      mode: data.mode ?? 'curly-mechanism',
      pos: [
        { x: from[0] + OX, y: from[1] + OY, z: 0 },
        { x: to[0] + OX, y: to[1] + OY, z: 0 },
      ],
      height: 0.25,
      height2: 0.25,
      autoRoute: true,
      ...(data.lpAttach ? { lpAttach: data.lpAttach } : {}),
      ...(data.raAttach ? { raAttach: data.raAttach } : {}),
      ...(data.bdAttach ? { bdAttach: data.bdAttach } : {}),
      ...(data.destAttach ? { destAttach: data.destAttach } : {}),
    },
  };
}

function write(name, mol, arrows) {
  const doc = {
    root: { nodes: [{ $ref: 'mol0' }, ...arrows] },
    mol0: mol,
  };
  fs.writeFileSync(
    path.join(outDir, name),
    JSON.stringify(doc, null, 4) + '\n',
    'utf8',
  );
  console.log('wrote', name);
}

// ── Visual Test 1: iodide lone pair -> tert-butyl carbocation ───────────────
write(
  'mechanism-carbocation-attack.ket',
  molecule(
    [
      { label: 'C', x: 0, y: 0, charge: 1 },
      { label: 'C', x: 0, y: 1 },
      { label: 'C', x: -0.866, y: -0.5 },
      { label: 'C', x: 0.866, y: -0.5 },
      { label: 'I', x: 2.35, y: 0.72, charge: -1 },
    ],
    [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
      { a: 0, b: 3 },
    ],
  ),
  [
    arrow([2.35, 0.72], [0, 0], {
      lpAttach: { atomId: 4, pairIdx: 0 },
      destAttach: { kind: 'new-bond', atomId1: 4, atomId2: 0 },
    }),
  ],
);

// ── Visual Test 2: SN2 backside attack ─────────────────────────────────────
write(
  'mechanism-sn2-backside.ket',
  molecule(
    [
      { label: 'C', x: 0, y: 0 },
      { label: 'Br', x: 1.25, y: 0 },
      { label: 'H', x: 0, y: 1 },
      { label: 'H', x: -0.72, y: -0.72 },
      { label: 'H', x: 0.72, y: -0.72 },
      { label: 'O', x: -2.1, y: 0, charge: -1 },
    ],
    [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
      { a: 0, b: 3, stereo: 6 },
      { a: 0, b: 4, stereo: 1 },
    ],
  ),
  [
    arrow([-2.1, 0], [0, 0], {
      lpAttach: { atomId: 5, pairIdx: 0 },
      destAttach: { kind: 'new-bond', atomId1: 5, atomId2: 0 },
    }),
    arrow([0.625, 0], [1.25, 0], {
      bdAttach: { bondId: 0, side: 1 },
      destAttach: { kind: 'atom', atomId: 1 },
    }),
  ],
);

// ── Visual Test 3: chloride adding to a ketone ─────────────────────────────
write(
  'mechanism-carbonyl-addition.ket',
  molecule(
    [
      { label: 'C', x: 0, y: 0 },
      { label: 'O', x: 0, y: 1.2 },
      { label: 'C', x: -0.9, y: -0.6 },
      { label: 'C', x: 0.9, y: -0.6 },
      { label: 'Cl', x: 2.2, y: 0.45, charge: -1 },
    ],
    [
      { a: 0, b: 1, type: 2 },
      { a: 0, b: 2 },
      { a: 0, b: 3 },
    ],
  ),
  [
    arrow([2.2, 0.45], [0, 0], {
      lpAttach: { atomId: 4, pairIdx: 0 },
      destAttach: { kind: 'new-bond', atomId1: 4, atomId2: 0 },
    }),
    arrow([0, 0.6], [0, 1.2], {
      bdAttach: { bondId: 0, side: -1, component: 'pi' },
      destAttach: { kind: 'atom', atomId: 1 },
    }),
  ],
);

// ── Visual Test 5: 1,2-hydride shift ───────────────────────────────────────
write(
  'mechanism-hydride-shift.ket',
  molecule(
    [
      { label: 'C', x: 0, y: 0 },
      { label: 'C', x: 1.2, y: 0, charge: 1 },
      { label: 'H', x: -0.15, y: 1 },
      { label: 'C', x: -0.9, y: 0.55 },
      { label: 'C', x: -0.9, y: -0.55 },
      { label: 'C', x: 2.1, y: 0.6 },
      { label: 'C', x: 2.1, y: -0.6 },
    ],
    [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
      { a: 0, b: 3 },
      { a: 0, b: 4 },
      { a: 1, b: 5 },
      { a: 1, b: 6 },
    ],
  ),
  [
    arrow([-0.075, 0.5], [1.2, 0], {
      bdAttach: { bondId: 1, side: 1 },
      destAttach: { kind: 'new-bond', atomId1: 2, atomId2: 1 },
    }),
  ],
);

// ── Visual Test 6: allylic resonance ───────────────────────────────────────
write(
  'mechanism-allyl-resonance.ket',
  molecule(
    [
      { label: 'C', x: -1.2, y: 0 },
      { label: 'C', x: 0, y: 0 },
      { label: 'C', x: 1.2, y: 0, charge: 1 },
      { label: 'C', x: -1.8, y: 0.8 },
      { label: 'C', x: 0, y: -1 },
      { label: 'C', x: 1.8, y: 0.8 },
    ],
    [
      { a: 0, b: 1, type: 2 },
      { a: 1, b: 2 },
      { a: 0, b: 3 },
      { a: 1, b: 4 },
      { a: 2, b: 5 },
    ],
  ),
  [
    arrow([-0.6, 0.25], [0.6, 0.25], {
      bdAttach: { bondId: 0, side: 1, component: 'pi' },
      destAttach: { kind: 'bond', bondId: 1, side: 1 },
    }),
  ],
);

// ── Visual Test 7: proton transfer ─────────────────────────────────────────
write(
  'mechanism-proton-transfer.ket',
  molecule(
    [
      { label: 'C', x: -1.2, y: -0.6 },
      { label: 'O', x: 0, y: 0, charge: -1 },
      { label: 'H', x: 1.5, y: 0.4 },
      { label: 'Br', x: 2.6, y: 0.4 },
    ],
    [
      { a: 0, b: 1 },
      { a: 2, b: 3 },
    ],
  ),
  [
    arrow([0, 0], [1.5, 0.4], {
      lpAttach: { atomId: 1, pairIdx: 0 },
      destAttach: { kind: 'atom', atomId: 2 },
    }),
    arrow([2.05, 0.4], [2.6, 0.4], {
      bdAttach: { bondId: 1, side: 1 },
      destAttach: { kind: 'atom', atomId: 3 },
    }),
  ],
);
