import { useEffect, useRef } from 'react';
import type { Geometry, Vec } from '../engine/geometry3d';

/**
 * A ball-and-stick view of a built shape (engine/geometry3d), drawn on a canvas: depth-sorted spheres, sticks for
 * bonds (two or three for a multiple bond), soft lobes for lone pairs. Drag or use the arrow keys to turn it. It turns
 * slowly by itself until first touched, unless the user asked for reduced motion.
 *
 * About 200 lines instead of Miew plus three.js (about 0.4 MB): the shapes taught here are small, and a canvas is
 * enough to show them clearly. Colours: the usual element colours (CPK), with the stage and text from the theme.
 */

type Matrix = [number, number, number, number, number, number, number, number, number];

const ELEMENT_COLOUR: Readonly<Record<string, string>> = {
  H: '#eef0f2', C: '#50565e', N: '#3b6fd6', O: '#dd4436', F: '#62bd4c', Cl: '#3aa83a', Br: '#a33a29', I: '#7b41a5',
  S: '#dcbc34', P: '#e5862d', B: '#e59d86', Xe: '#3aa5b6', Be: '#b9d36a', Al: '#a7a2b4', Si: '#c9a77d',
};
const CARBON_ON_DARK = '#8b929b';
const BALL: Readonly<Record<string, number>> = { H: 0.26 };

const multiply = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
const turnX = (t: number): Matrix => [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)];
const turnY = (t: number): Matrix => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
const apply = (m: Matrix, p: Vec): Vec => ({
  x: m[0] * p.x + m[1] * p.y + m[2] * p.z, y: m[3] * p.x + m[4] * p.y + m[5] * p.z, z: m[6] * p.x + m[7] * p.y + m[8] * p.z,
});

/**
 * A starting view that shows the shape: of 400 directions round the molecule, the one where atoms and lone pairs
 * overlap least on screen (so a lone pair is not pointing at the viewer and hidden behind its atom), then turned so
 * the widest spread runs across.
 */
function orient(geometry: Geometry): Matrix {
  // A lone pair counts at the tip of its lobe, twice over, so the view prefers to show it side-on.
  const owner = new Map(geometry.atoms.map((a) => [a.id, a.p]));
  const tips = geometry.lonePairs.map((l) => { const o = owner.get(l.atom)!; return { x: o.x + (l.p.x - o.x) * 1.8, y: o.y + (l.p.y - o.y) * 1.8, z: o.z + (l.p.z - o.z) * 1.8 }; });
  const pts = [...geometry.atoms.map((a) => a.p), ...tips, ...tips];
  const n = 400, golden = Math.PI * (3 - Math.sqrt(5));
  let best: { score: number; z: Vec } | null = null;
  for (let k = 0; k < n; k++) {
    const y = 1 - (k + 0.5) / n, r = Math.sqrt(1 - y * y), z: Vec = { x: Math.cos(golden * k) * r, y, z: Math.sin(golden * k) * r };
    const { u, v } = basis(z);
    const flat = pts.map((p) => [dot3(p, u), dot3(p, v)]);
    let score = 0;
    for (let a = 0; a < flat.length; a++) for (let b = a + 1; b < flat.length; b++) {
      const d2 = (flat[a][0] - flat[b][0]) ** 2 + (flat[a][1] - flat[b][1]) ** 2;
      score += Math.exp(-d2 / 0.5);
    }
    if (!best || score < best.score - 1e-9) best = { score, z };
  }
  const z = best!.z, { u, v } = basis(z);
  // The widest in-plane spread runs across the screen.
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { const a = dot3(p, u), b = dot3(p, v); sxx += a * a; syy += b * b; sxy += a * b; }
  const t = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(t), s = Math.sin(t);
  const x: Vec = { x: c * u.x + s * v.x, y: c * u.y + s * v.y, z: c * u.z + s * v.z };
  const yAxis: Vec = { x: z.y * x.z - z.z * x.y, y: z.z * x.x - z.x * x.z, z: z.x * x.y - z.y * x.x };
  return [x.x, x.y, x.z, yAxis.x, yAxis.y, yAxis.z, z.x, z.y, z.z];
}
const dot3 = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;
function basis(z: Vec) {
  const helper: Vec = Math.abs(z.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const ux = { x: helper.y * z.z - helper.z * z.y, y: helper.z * z.x - helper.x * z.z, z: helper.x * z.y - helper.y * z.x };
  const l = Math.hypot(ux.x, ux.y, ux.z);
  const u = { x: ux.x / l, y: ux.y / l, z: ux.z / l };
  return { u, v: { x: z.y * u.z - z.z * u.y, y: z.z * u.x - z.x * u.z, z: z.x * u.y - z.y * u.x } };
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
};

export interface MoleculeViewerProps {
  geometry: Geometry;
  /** Draw the lone pairs (on atoms with two or more neighbours, where they set the shape). */
  showLonePairs?: boolean;
  /** An atom to mark, such as the centre being asked about. */
  highlight?: string;
  /** What a screen reader hears, such as "Ammonia, trigonal pyramidal". */
  label: string;
  className?: string;
}

export function MoleculeViewer({ geometry, showLonePairs = true, highlight, label, className }: MoleculeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<{ rotation: Matrix; spinning: boolean; geometry: Geometry | null }>({ rotation: turnX(0), spinning: true, geometry: null });
  const draw = useRef<() => void>(() => {});

  draw.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (view.current.geometry !== geometry) view.current = { ...view.current, rotation: orient(geometry), geometry };
    const width = canvas.clientWidth, height = canvas.clientHeight, ratio = window.devicePixelRatio || 1;
    if (!width || !height) return;
    if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
    if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const style = getComputedStyle(canvas);
    const dark = document.documentElement.getAttribute('data-mnx-scheme') === 'dark' || style.colorScheme === 'dark';
    const accent = style.getPropertyValue('--mnx-accent').trim() || '#3b82f6';
    const stick = dark ? '#9aa1aa' : '#8a9099';

    const atoms = geometry.atoms.map((atom) => ({ ...atom, q: apply(view.current.rotation, atom.p) }));
    const at = new Map(atoms.map((atom) => [atom.id, atom]));
    const reach = Math.max(1, ...atoms.map((a) => Math.hypot(a.p.x, a.p.y, a.p.z))) + 0.6;
    const fit = (Math.min(width, height) / 2) * 0.86 / reach;
    const camera = reach * 4;
    const project = (q: Vec) => { const f = camera / (camera - q.z); return { x: width / 2 + q.x * fit * f, y: height / 2 - q.y * fit * f, f }; };
    const colour = (el: string) => (el === 'C' && dark ? CARBON_ON_DARK : ELEMENT_COLOUR[el] ?? '#c58bd3');
    const ball = (el: string) => BALL[el] ?? 0.36;

    const items: { z: number; paint: () => void }[] = [];
    for (const bond of geometry.bonds) {
      const a = at.get(bond.a), b = at.get(bond.b);
      if (!a || !b) continue;
      const pa = project(a.q), pb = project(b.q);
      const dx = pb.x - pa.x, dy = pb.y - pa.y, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, f = (pa.f + pb.f) / 2;
      const offsets = bond.order === 2 ? [-0.09, 0.09] : bond.order === 3 ? [-0.13, 0, 0.13] : [0];
      const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
      // Each half is painted just before its own atom, so a ball always sits on top of the sticks it holds.
      for (const [from, z] of [[pa, a.q.z], [pb, b.q.z]] as const) items.push({ z: z - 1e-3, paint: () => {
        ctx.lineCap = 'butt';
        ctx.strokeStyle = stick;
        ctx.lineWidth = Math.max(2, (offsets.length > 1 ? 0.07 : 0.11) * fit * f);
        for (const o of offsets) {
          const ox = nx * o * fit * f, oy = ny * o * fit * f;
          ctx.beginPath(); ctx.moveTo(from.x + ox, from.y + oy); ctx.lineTo(mx + ox, my + oy); ctx.stroke();
        }
      } });
    }
    if (showLonePairs) for (const pair of geometry.lonePairs) {
      const owner = at.get(pair.atom);
      if (!owner) continue;
      const q = apply(view.current.rotation, pair.p);
      const po = project(owner.q), pl = project(q);
      const dx = pl.x - po.x, dy = pl.y - po.y, d = Math.hypot(dx, dy);
      const f = pl.f, along = 0.48 * fit * f, across = 0.27 * fit * f;
      // Foreshortened when the pair points at or away from the viewer.
      const length = Math.max(across, Math.min(along, d * 1.15));
      const angle = Math.atan2(dy, dx);
      // The lobe starts at the ball's edge, so it does not cover the element letter.
      const start = ball(owner.el) * fit * po.f * 0.6;
      const cx = po.x + Math.cos(angle) * (start + length * 0.9), cy = po.y + Math.sin(angle) * (start + length * 0.9);
      items.push({ z: q.z, paint: () => {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(cx, cy, length, across, angle, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9;
        const r = Math.max(1.5, 0.045 * fit * f), tip = length * 0.55, px = -Math.sin(angle) * r * 1.6, py = Math.cos(angle) * r * 1.6;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * tip + px * s, cy + Math.sin(angle) * tip + py * s, r, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      } });
    }
    for (const atom of atoms) {
      const p = project(atom.q), r = ball(atom.el) * fit * p.f, base = colour(atom.el);
      items.push({ z: atom.q.z, paint: () => {
        const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
        g.addColorStop(0, shade(base, 0.55)); g.addColorStop(0.55, base); g.addColorStop(1, shade(base, -0.35));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        if (atom.id === highlight) { ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
        if (atom.el !== 'H' && atom.el !== 'C' && r > 9) {
          ctx.fillStyle = isLight(base) ? '#1a1d21' : '#ffffff';
          ctx.font = `600 ${Math.round(r * 0.8)}px ${style.getPropertyValue('--mnx-font').trim() || 'system-ui, sans-serif'}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(atom.el, p.x, p.y + 1);
        }
      } });
    }
    items.sort((a, b) => a.z - b.z).forEach((item) => item.paint());
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = () => document.documentElement.getAttribute('data-mnx-motion') === 'reduced'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const tick = () => {
      if (view.current.spinning && !reduced()) view.current.rotation = multiply(turnY(0.006), view.current.rotation);
      draw.current();
      frame = view.current.spinning && !reduced() ? requestAnimationFrame(tick) : 0;
    };
    tick();
    const resize = new ResizeObserver(() => draw.current());
    resize.observe(canvas);
    const theme = new MutationObserver(() => draw.current());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mnx-scheme', 'style', 'data-mnx-motion'] });

    let last: { x: number; y: number } | null = null;
    const stop = () => { view.current.spinning = false; if (frame) cancelAnimationFrame(frame); frame = 0; };
    const turn = (dx: number, dy: number) => { view.current.rotation = multiply(turnX(dy), multiply(turnY(dx), view.current.rotation)); draw.current(); };
    const down = (event: PointerEvent) => { stop(); last = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => {
      if (!last) return;
      turn((event.clientX - last.x) * 0.012, (event.clientY - last.y) * 0.012);
      last = { x: event.clientX, y: event.clientY };
    };
    const up = () => { last = null; };
    const key = (event: KeyboardEvent) => {
      const step = 0.2, moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const m = moves[event.key];
      if (!m) return;
      event.preventDefault(); stop(); turn(...m);
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('keydown', key);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect(); theme.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('keydown', key);
    };
  }, []);

  useEffect(() => { draw.current(); }, [geometry, showLonePairs, highlight]);

  return <canvas ref={canvasRef} className={className} tabIndex={0} role="img"
    aria-label={`${label}. Drag or use the arrow keys to turn it.`}
    style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab' }} />;
}
