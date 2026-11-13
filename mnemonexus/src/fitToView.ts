import type { MechanismEditorApi } from 'ketcher-react';

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

type Box = { minX: number; minY: number; width: number; height: number };
interface EditorInternals {
  struct(): { getCoordBoundingBox(): { min: { x: number; y: number }; max: { x: number; y: number } }; atoms: { size: number } };
  render: { options: { microModeScale: number; zoom: number }; clientArea: HTMLElement; viewBox?: Box; setViewBox?(box: Box): void };
  zoom(value?: number): number;
  centerViewportAccordingToStruct?(): void;
  setOptions(options: string): unknown;
}
const internals = (api: MechanismEditorApi) => api.ketcher.editor as unknown as EditorInternals;

/** The zoom that makes a box of `w` × `h` model units fill the canvas: the editor itself only ever zooms out. */
function zoomFor(editor: EditorInternals, w: number, h: number) {
  const area = editor.render.clientArea.getBoundingClientRect(), unit = editor.render.options.microModeScale;
  const zoom = Math.max(0.4, Math.min(2.4, (area.width - 140) / (Math.max(1.5, w) * unit), (area.height - 140) / (Math.max(1.5, h) * unit)));
  return Math.round(zoom * 10) / 10;
}

/**
 * Re-route the arrows. An arrow from a lone pair caches its route, measured from where the lone pair was drawn, and
 * the cache is keyed on the render settings but not the zoom, so after a zoom it is drawn at the old scale, off the
 * molecule. Turning lone pairs off and on (a frame apart, so each change is painted) changes the key and forces a
 * fresh route. It is also needed after every load: a lone-pair arrow is routed before its lone pair is painted, and
 * without this it is drawn far off the molecule. The real fix belongs in the editor (rerxnarrow.ts
 * routingSettingsKey); this stands in until the fork can be rebuilt. Routing is kept cheap by the pack build's time
 * limit on the router (vite.config.pack.ts routeTimeBudget).
 */
async function reroute(editor: EditorInternals) {
  editor.setOptions(JSON.stringify({ showLonePairs: false }));
  await frame();
  editor.setOptions(JSON.stringify({ showLonePairs: true }));
  await frame();
}

/** The editor's colour for curly arrows (ketcher-core mechanism/constants MECH_ARROW_COLOR). */
const ARROW = '#cc0000';

/**
 * The screen box of the drawn molecules (bonds, labels, lone pairs), skipping full-canvas layers, invisible hover
 * targets and the curly arrows. An arrow is first painted from its stored position, at the wrong scale and far from the
 * molecule, until its route arrives, and measuring it then zoomed some frames out to half size.
 */
function paintedBox(canvas: HTMLElement): DOMRect | null {
  const svg = canvas.querySelector('svg');
  if (!svg) return null;
  const limit = canvas.getBoundingClientRect();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const el of svg.querySelectorAll('path, text, circle, ellipse')) {
    if (el.getAttribute('opacity') === '0') continue;
    if ([el.getAttribute('stroke'), el.getAttribute('fill')].some((c) => c?.toLowerCase() === ARROW)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (r.width >= limit.width * 0.95 && r.height >= limit.height * 0.95) continue;
    left = Math.min(left, r.left); top = Math.min(top, r.top); right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
  }
  return Number.isFinite(left) ? new DOMRect(left, top, right - left, bottom - top) : null;
}

/**
 * Centre what was actually painted. The editor's own centring can land tens of pixels off once atoms have moved
 * between frames, cutting labels at one edge. Zooms out first (and re-routes) if the drawing does not fit.
 */
async function centrePainted(editor: EditorInternals) {
  const render = editor.render, area = render.clientArea.getBoundingClientRect();
  let drawn = paintedBox(render.clientArea);
  if (!drawn || !render.setViewBox || !render.viewBox) return;
  const shrink = Math.min(1, (area.width - 48) / drawn.width, (area.height - 48) / drawn.height);
  if (shrink < 1) {
    editor.zoom(Math.max(0.4, Math.floor(render.options.zoom * shrink * 10) / 10));
    await frame();
    await reroute(editor);
    drawn = paintedBox(render.clientArea);
    if (!drawn) return;
  }
  const scale = render.options.zoom, view = render.viewBox;
  const dx = (drawn.left + drawn.width / 2 - (area.left + area.width / 2)) / scale;
  const dy = (drawn.top + drawn.height / 2 - (area.top + area.height / 2)) / scale;
  render.setViewBox({ ...view, minX: view.minX + dx, minY: view.minY + dy });
}

/** Zoom so the structure already in the editor fills the canvas, and centre it (small molecules are tiny at 100%). */
export async function fitToView(api: MechanismEditorApi) {
  const editor = internals(api);
  try {
    const struct = editor.struct();
    if (!struct.atoms.size) return;
    const box = struct.getCoordBoundingBox();
    const zoom = zoomFor(editor, box.max.x - box.min.x, box.max.y - box.min.y);
    editor.zoom(zoom);
    editor.centerViewportAccordingToStruct?.();
    await frame();
    await reroute(editor);
    await centrePainted(editor);
  } catch { /* An editor without these internals keeps its own view. */ }
}

/**
 * Load a document already zoomed to fit it (the zoom comes from the KET's own atom coordinates), so it is painted at
 * its final scale and the view does not jump.
 */
export async function loadFitted(api: MechanismEditorApi, ket: string) {
  const editor = internals(api);
  try {
    const box = ketBox(ket);
    if (box) editor.zoom(zoomFor(editor, box.w, box.h));
  } catch { /* Fall back to fitting after the load. */ }
  const before = editor.render.options.zoom;
  await api.loadKet(ket);
  await frame();
  try {
    if (editor.render.options.zoom !== before) { await fitToView(api); return; }
    editor.centerViewportAccordingToStruct?.();
    await frame();
    await reroute(editor);
    await centrePainted(editor);
  } catch { /* An editor without these internals keeps its own view. */ }
}

/** The extent of every atom in a KET document, in model units. */
function ketBox(ket: string): { w: number; h: number } | null {
  const doc = JSON.parse(ket) as Record<string, { type?: string; atoms?: { location?: number[] }[] }>;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [key, node] of Object.entries(doc)) {
    if (key === 'root' || node?.type !== 'molecule') continue;
    for (const atom of node.atoms ?? []) {
      const [x, y] = atom.location ?? [];
      if (typeof x !== 'number' || typeof y !== 'number') continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return Number.isFinite(minX) ? { w: maxX - minX, h: maxY - minY } : null;
}
