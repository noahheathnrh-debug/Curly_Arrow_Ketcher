import { useMemo, useState } from 'react';
import { buildGeometry, type Centre } from '../engine/geometry3d';
import { buildStructure, ELEMENTS } from '../engine/molecule';
import { MoleculeViewer } from './MoleculeViewer';
import { SHAPE_EXAMPLES, type ShapeExample } from './shapes';
import styles from './molecules.module.css';

/** What the centre's domains are, in words: "3 bonded atoms and 1 lone pair". */
function domainWords(centre: Centre) {
  const bonded = centre.domains - centre.lonePairs;
  const parts = [`${bonded} bonded ${bonded === 1 ? 'atom' : 'atoms'}`];
  if (centre.lonePairs) parts.push(`${centre.lonePairs} lone ${centre.lonePairs === 1 ? 'pair' : 'pairs'}`);
  return parts.join(' and ');
}

/** The distinct angles as built, grouped (90° ×8, 120° ×3...). */
function builtAngles(angles: number[]) {
  const groups: { value: number; count: number }[] = [];
  for (const a of [...angles].sort((x, y) => x - y)) {
    const group = groups.find((g) => Math.abs(g.value - a) < 2.5);
    if (group) { group.value = (group.value * group.count + a) / (group.count + 1); group.count++; }
    else groups.push({ value: a, count: 1 });
  }
  return groups.map((g) => `${g.value.toFixed(1)}°${g.count > 1 ? ` ×${g.count}` : ''}`).join(', ');
}

function useShape(example: ShapeExample) {
  return useMemo(() => {
    const { structure, issues } = buildStructure(example.spec, 'structure', { expandedOctets: true });
    if (!structure) return { error: issues.map((i) => i.message).join(' ') };
    const geometry = buildGeometry(structure);
    const centre = geometry.centres.find((c) => c.atom === 'X') ?? geometry.centres[0];
    const central = structure.atoms.find((a) => a.id === centre?.atom);
    return { geometry, centre, centralName: central ? ELEMENTS[central.el]?.name ?? central.el : '' };
  }, [example]);
}

export function ShapesExplorer({ examples = SHAPE_EXAMPLES }: { examples?: readonly ShapeExample[] }) {
  const [selected, setSelected] = useState(examples[0]);
  const [lonePairs, setLonePairs] = useState(true);
  const shape = useShape(selected);
  return <div className={styles.explorer}>
    <nav className={styles.picker} aria-label="Molecules">
      {examples.map((example) => <button key={example.id} type="button" aria-pressed={example === selected}
        className={styles.pick} onClick={() => setSelected(example)}>
        <span className={styles.formula}>{example.formula}</span><span className={styles.name}>{example.name}</span>
      </button>)}
    </nav>
    <section className={styles.stage}>
      {'error' in shape ? <p role="alert">{shape.error}</p> : <>
        <div className={styles.viewer}>
          <MoleculeViewer geometry={shape.geometry} showLonePairs={lonePairs} highlight={shape.centre?.atom}
            label={`${selected.name}, ${shape.centre?.shape ?? 'its shape'}`} />
        </div>
        <div className={styles.facts}>
          <h2>{selected.name} <span className={styles.formula}>{selected.formula}</span></h2>
          {shape.centre && <dl>
            <div><dt>Around {shape.centralName}</dt><dd>{shape.centre.domains} electron domains: {domainWords(shape.centre)}</dd></div>
            <div><dt>Shape</dt><dd>{shape.centre.shape}</dd></div>
            <div><dt>Textbook angle</dt><dd>{shape.centre.ideal}</dd></div>
            <div><dt>As built here</dt><dd>{builtAngles(shape.centre.angles)}</dd></div>
          </dl>}
          {selected.note && <p className={styles.note}>{selected.note}</p>}
          <label className={styles.toggle}><input type="checkbox" checked={lonePairs} onChange={(e) => setLonePairs(e.target.checked)} /> Show lone pairs</label>
        </div>
      </>}
    </section>
  </div>;
}
