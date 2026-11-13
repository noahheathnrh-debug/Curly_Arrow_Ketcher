import { useMemo, useState, type ReactNode } from 'react';
import { subscripts } from '../isomers/cip';
import { aromaticAtoms, C13_RANGES, carbonPeaks, H1_RANGES, irBands, massSpectrum, protonPeaks, splittingName, type SGraph } from './predict';
import { fingerprint, groupLabel } from './questions';
import styles from './spectra.module.css';

/**
 * The four predicted spectra of one molecule, one at a time, each with its peak table. Pointing at a peak (or its
 * row) names the atoms behind it through `onFocus`, so the activity can light them up on the drawing.
 */
export type SpectrumTab = 'h' | 'c' | 'ir' | 'ms';
export const TAB_LABELS: Readonly<Record<SpectrumTab, string>> = { h: '¹H NMR', c: '¹³C NMR', ir: 'Infrared', ms: 'Mass' };

interface Props {
  graph: SGraph;
  tab: SpectrumTab;
  onTab: (tab: SpectrumTab) => void;
  tabs?: readonly SpectrumTab[];
  /** Atoms behind the peak pointed at, or null when the pointer leaves. */
  onFocus?: (atoms: number[] | null) => void;
  title?: string;
  /** Shown before the tabs (the "whose spectra" switch). */
  lead?: ReactNode;
  /** False for an unknown: the tables give the data only, not which group or bond each peak is. */
  reveal?: boolean;
}

const W = 560, H = 200, LEFT = 22, RIGHT = 538, BASE = 160;

export function SpectraCharts({ graph, tab, onTab, tabs = ['h', 'c', 'ir', 'ms'], onFocus, title, lead, reveal = true }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const focus = (index: number | null, atoms: number[] | null) => { setHover(index); onFocus?.(atoms); };
  return <section className={styles.charts} aria-label={title ?? 'Predicted spectra'}>
    <div className={styles.tabs}>
      {lead}
      {title && <span className={styles.chartTitle}>{title}</span>}
      <span role="tablist" className={styles.tabs}>
      {tabs.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={styles.tab} onClick={() => { onTab(t); focus(null, null); }}>{TAB_LABELS[t]}</button>)}</span>
    </div>
    {tab === 'h' && <ProtonChart graph={graph} hover={hover} focus={focus} reveal={reveal} />}
    {tab === 'c' && <CarbonChart graph={graph} hover={hover} focus={focus} reveal={reveal} />}
    {tab === 'ir' && <IrChart graph={graph} hover={hover} focus={focus} reveal={reveal} />}
    {tab === 'ms' && <MassChart graph={graph} hover={hover} focus={focus} reveal={reveal} />}
  </section>;
}

interface ChartProps { graph: SGraph; hover: number | null; focus: (index: number | null, atoms: number[] | null) => void; reveal: boolean }

const pascal = (n: number) => { let row = [1]; for (let k = 0; k < n; k++) row = [1, ...row.slice(1).map((v, i) => v + row[i]), 1]; return row; };
const SHORT: Readonly<Record<string, string>> = { singlet: 's', doublet: 'd', triplet: 't', quartet: 'q', quintet: 'quin', sextet: 'sext', septet: 'sept', octet: 'oct', nonet: 'non', multiplet: 'm' };

/** Labels spread into rows so neighbours never overlap: each label goes on the lowest row it fits. */
function stack(xs: readonly number[], gap: number): number[] {
  const rows: number[][] = [];
  return xs.map((x) => {
    let row = rows.findIndex((r) => r.every((y) => Math.abs(y - x) >= gap));
    if (row < 0) { rows.push([]); row = rows.length - 1; }
    rows[row].push(x);
    return row;
  });
}

function Axis({ ticks, x, label }: { ticks: number[]; x: (v: number) => number; label: string }) {
  return <g className={styles.axis}>
    <line x1={LEFT} x2={RIGHT} y1={BASE} y2={BASE} />
    {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={BASE} y2={BASE + 4} /><text x={x(t)} y={BASE + 16} textAnchor="middle">{t}</text></g>)}
    <text x={RIGHT} y={BASE + 32} textAnchor="end" className={styles.axisLabel}>{label}</text>
  </g>;
}

const rowProps = (index: number, atoms: number[], focus: ChartProps['focus'], hover: number | null) => ({
  onMouseEnter: () => focus(index, atoms), onMouseLeave: () => focus(null, null), onFocus: () => focus(index, atoms), onBlur: () => focus(null, null),
  tabIndex: 0, 'data-hover': hover === index ? 'true' : undefined,
});

function ProtonChart({ graph, hover, focus, reveal }: ChartProps) {
  const peaks = useMemo(() => protonPeaks(graph), [graph]);
  const hi = Math.max(10, Math.ceil(Math.max(...peaks.map((p) => p.shift)) + 0.6));
  const x = (ppm: number) => LEFT + ((hi - ppm) / hi) * (RIGHT - LEFT);
  const most = Math.max(...peaks.map((p) => p.count));
  const rows = stack(peaks.map((p) => x(p.shift)), 34);
  return <div className={styles.chartBody}>
    <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`¹H NMR: ${peaks.length} peaks`}>
      <Axis ticks={Array.from({ length: hi + 1 }, (_, i) => hi - i)} x={x} label="δ / ppm" />
      <g className={styles.reference}><line x1={x(0)} x2={x(0)} y1={BASE} y2={BASE - 22} /><text x={x(0)} y={BASE - 26} textAnchor="middle">TMS</text></g>
      {peaks.map((p, i) => {
        const lines = p.next < 0 ? [0.45, 0.8, 1, 0.9, 0.7, 0.4] : pascal(p.next);
        const top = Math.max(...lines);
        const tall = 34 + 86 * (p.count / most);
        const spread = Math.min(4, 26 / Math.max(1, lines.length));
        const labelY = BASE - tall - 18 - rows[i] * 24;
        return <g key={i} className={styles.peak} {...rowProps(i, p.atoms, focus, hover)}>
          {lines.map((v, k) => { const lx = x(p.shift) + (k - (lines.length - 1) / 2) * spread; return <line key={k} x1={lx} x2={lx} y1={BASE} y2={BASE - (tall * v) / top} />; })}
          <text x={x(p.shift)} y={labelY} textAnchor="middle" className={styles.peakLabel}>{p.count}H</text>
          <text x={x(p.shift)} y={labelY + 11} textAnchor="middle" className={styles.peakSub}>{SHORT[splittingName(p.next)] ?? ''}</text>
        </g>;
      })}
    </svg>
    <div className={styles.side}><table className={styles.table}>
      <thead><tr><th>δ / ppm</th><th>Area</th><th>Splitting</th>{reveal && <th>Group</th>}</tr></thead>
      <tbody>{peaks.map((p, i) => <tr key={i} {...rowProps(i, p.atoms, focus, hover)} title={reveal ? H1_RANGES[p.kind].about : undefined}>
        <td>{p.shift.toFixed(1)}</td><td>{p.count}H</td><td>{splittingName(p.next)}{p.next > 0 ? ` (n = ${p.next})` : ''}</td>
        {reveal && <td>{subscripts(groupLabel(graph, p.atoms[0], 'H'))}{p.atoms.length > 1 ? ` ×${p.atoms.length}` : ''}</td>}
      </tr>)}</tbody>
    </table></div>
  </div>;
}

function CarbonChart({ graph, hover, focus, reveal }: ChartProps) {
  const peaks = useMemo(() => carbonPeaks(graph), [graph]);
  const x = (ppm: number) => LEFT + ((220 - ppm) / 220) * (RIGHT - LEFT);
  const rows = stack(peaks.map((p) => x(p.shift)), 30);
  return <div className={styles.chartBody}>
    <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`¹³C NMR: ${peaks.length} peaks`}>
      <Axis ticks={[220, 200, 180, 160, 140, 120, 100, 80, 60, 40, 20, 0]} x={x} label="δ / ppm" />
      {peaks.map((p, i) => <g key={i} className={styles.peak} {...rowProps(i, p.atoms, focus, hover)}>
        <line x1={x(p.shift)} x2={x(p.shift)} y1={BASE} y2={BASE - 100} />
        <text x={x(p.shift)} y={BASE - 106 - rows[i] * 13} textAnchor="middle" className={styles.peakSub}>{Math.round(p.shift)}</text>
      </g>)}
    </svg>
    <div className={styles.side}><table className={styles.table}>
      <thead><tr><th>δ / ppm</th>{reveal && <><th>Carbon</th><th>Data-sheet range</th></>}</tr></thead>
      <tbody>{peaks.map((p, i) => <tr key={i} {...rowProps(i, p.atoms, focus, hover)}>
        <td>{p.shift.toFixed(0)}</td>
        {reveal && <><td>{subscripts(groupLabel(graph, p.atoms[0], 'C'))}{p.atoms.length > 1 ? ` ×${p.atoms.length}` : ''}</td>
        <td>{C13_RANGES[p.kind].range.join('–')}: {C13_RANGES[p.kind].about}</td></>}
      </tr>)}</tbody>
    </table></div>
  </div>;
}

/** A small number in [0, 1) from a word, so a molecule's fingerprint region is always the same. */
function hash(words: string, k: number): number {
  let h = 2166136261 ^ k;
  for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
const DEPTH: Readonly<Record<string, number>> = { 'C=O': 0.85, 'O–H (alcohol)': 0.7, 'O–H (acid)': 0.55, 'C–O': 0.7, 'C–H': 0.55, 'C=C': 0.4, 'C≡N': 0.5, 'N–H': 0.35 };

function IrChart({ graph, hover, focus, reveal }: ChartProps) {
  const bands = useMemo(() => irBands(graph), [graph]);
  const curve = useMemo(() => {
    const arom = aromaticAtoms(graph);
    const dips: { centre: number; width: number; depth: number }[] = [];
    for (const b of bands) {
      const width = b.bond === 'O–H (acid)' ? 210 : b.broad ? 95 : b.bond === 'C–O' ? 36 : b.bond === 'C–H' ? 26 : 16;
      dips.push({ centre: b.centre, width, depth: DEPTH[b.bond] ?? 0.4 });
      if (b.bond === 'C–H') dips.push({ centre: 2875, width: 20, depth: 0.4 });
      if (b.bond === 'N–H' && b.atoms.some((i) => graph.atoms[i].h === 2)) dips.push({ centre: 3305, width: 26, depth: 0.3 });
    }
    if (graph.atoms.some((a, i) => a.el === 'C' && a.h && arom.has(i))) dips.push({ centre: 3050, width: 16, depth: 0.25 }, { centre: 1600, width: 10, depth: 0.3 }, { centre: 1495, width: 10, depth: 0.3 });
    if (graph.atoms.some((a, i) => a.el === 'C' && a.h && !arom.has(i))) dips.push({ centre: 1460, width: 14, depth: 0.35 }, { centre: 1375, width: 10, depth: 0.25 });
    const word = fingerprint(graph);
    for (let k = 0; k < 6; k++) dips.push({ centre: 620 + 860 * hash(word, k), width: 10 + 14 * hash(word, k + 10), depth: 0.08 + 0.16 * hash(word, k + 20) });
    return dips;
  }, [graph, bands]);
  const x = (nu: number) => LEFT + ((4000 - nu) / 3500) * (RIGHT - LEFT);
  const y = (t: number) => BASE - 4 - (t / 100) * 130;
  const T = (nu: number) => 100 * curve.reduce((t, d) => t * (1 - d.depth * Math.exp(-(((nu - d.centre) / d.width) ** 2))), 1);
  const path = Array.from({ length: 701 }, (_, i) => 4000 - i * 5).map((nu, i) => `${i ? 'L' : 'M'}${x(nu).toFixed(1)},${y(T(nu)).toFixed(1)}`).join('');
  const rows = stack(bands.map((b) => x(b.centre)), 56);
  return <div className={styles.chartBody}>
    <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Infrared: ${bands.map((b) => b.bond).join(', ')}`}>
      <Axis ticks={[4000, 3500, 3000, 2500, 2000, 1500, 1000, 500]} x={x} label="wavenumber / cm⁻¹" />
      <rect x={x(1500)} y={y(100) - 6} width={x(500) - x(1500)} height={BASE - y(100) + 2} className={styles.print} />
      <text x={(x(1500) + x(500)) / 2} y={y(100) - 10} textAnchor="middle" className={styles.peakSub}>fingerprint region</text>
      <path d={path} className={styles.trace} />
      {bands.map((b, i) => <g key={i} className={styles.band} {...rowProps(i, b.atoms, focus, hover)}>
        <line x1={x(b.centre)} x2={x(b.centre)} y1={y(T(b.centre)) + 3} y2={BASE - 15 - rows[i] * 12} />
        <text x={x(b.centre)} y={BASE - 4 - rows[i] * 12} textAnchor="middle" className={styles.peakSub}>{reveal ? b.bond.replace(/ \(.*\)/, '') : b.centre}</text>
      </g>)}
    </svg>
    <div className={styles.side}><table className={styles.table}>
      <thead><tr><th>Band / cm⁻¹</th>{reveal && <><th>Bond</th><th>Data-sheet range</th></>}</tr></thead>
      <tbody>{bands.map((b, i) => <tr key={i} {...rowProps(i, b.atoms, focus, hover)}>
        <td>{b.centre}{b.broad ? ' (broad)' : ''}</td>{reveal && <><td>{b.bond}</td><td>{b.range.join('–')}</td></>}
      </tr>)}</tbody>
    </table></div>
  </div>;
}

function MassChart({ graph, hover, focus, reveal }: ChartProps) {
  const peaks = useMemo(() => massSpectrum(graph), [graph]);
  const hiMz = Math.ceil((Math.max(...peaks.map((p) => p.mz)) + 6) / 10) * 10;
  const x = (mz: number) => LEFT + (mz / hiMz) * (RIGHT - LEFT);
  const labelled = peaks.map((p) => p.height >= 20 || p.kind === 'molecular');
  const rows = stack(peaks.map((p, i) => (labelled[i] ? x(p.mz) : -999)), 26);
  const listed = [...peaks].sort((a, b) => b.height - a.height).slice(0, 8);
  return <div className={styles.chartBody}>
    <svg className={styles.plot} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mass spectrum: molecular ion at m/z ${peaks.find((p) => p.kind === 'molecular')?.mz}`}>
      <Axis ticks={Array.from({ length: hiMz / 10 + 1 }, (_, i) => i * 10).filter((t) => hiMz <= 150 || t % 20 === 0)} x={x} label="m/z" />
      {peaks.map((p, i) => <g key={i} className={styles.peak} data-kind={p.kind} {...rowProps(i, p.atoms, focus, hover)}>
        <rect x={x(p.mz) - 1.5} y={BASE - 1.3 * p.height} width={3} height={1.3 * p.height} />
        {labelled[i] && <text x={x(p.mz)} y={BASE - 1.3 * p.height - 5 - rows[i] * 12} textAnchor="middle" className={styles.peakSub}>{p.mz}</text>}
      </g>)}
    </svg>
    <div className={styles.side}><table className={styles.table}>
      <thead><tr><th>m/z</th><th>Height</th>{reveal && <th>Ion</th>}</tr></thead>
      <tbody>{listed.map((p) => { const i = peaks.indexOf(p); return <tr key={p.mz} {...rowProps(i, p.atoms, focus, hover)}>
        <td>{p.mz}</td><td>{Math.round(p.height)}%</td>{reveal && <td>{subscripts(p.label)}{p.kind === 'fragment' ? '⁺' : ''}</td>}
      </tr>; })}</tbody>
    </table>
    <p className={styles.note}>Which m/z values appear is exact; heights are a rough guide to how stable each ion is.</p></div>
  </div>;
}
