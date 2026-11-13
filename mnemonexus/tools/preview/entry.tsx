import '../../src/sandboxShims';
import '../../src/raphaelShim';
import 'ketcher-react/dist/index.css';
import '../../src/index.css';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { ShapesExplorer } from '../../src/molecules/ShapesExplorer';
import { ShapesActivity } from '../../src/molecules/ShapesActivity';
import { KeyActivity } from '../../src/key/KeyActivity';
import { LewisActivity } from '../../src/lewis/LewisActivity';
import { IsomersActivity } from '../../src/isomers/IsomersActivity';
import { DrawIsomersActivity } from '../../src/isomers/DrawIsomersActivity';
import { SpectraActivity } from '../../src/spectra/SpectraActivity';
import { LESSONS } from '../../src/lessons';
import { TEMPLATES } from '../../src/practice/templates';
import { rngOf } from '../../src/practice/generate';
import { buildLesson } from '../../src/lessons/kit';
import { LessonPlayer } from '../../src/lessons/LessonPlayer';
import { offlineStructServiceProvider } from '../../src/offlineStructService';
import { MechanismEditor } from 'ketcher-react';

/**
 * Pages of the add-on, rendered outside the app for screenshots (run.mjs). The theme is a hand-made stand-in for the
 * host's theme-v1 tokens, close enough to judge light and dark.
 */
const THEMES: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--mnx-text': '#1b1f24', '--mnx-text-muted': '#5b6470', '--mnx-canvas': '#f3f4f6', '--mnx-surface': '#ffffff', '--mnx-surface-2': '#eef1f4',
    '--mnx-accent': '#3a6ff0', '--mnx-accent-soft': '#dfe8fd', '--mnx-accent-text': '#ffffff', '--mnx-focus': '#3a6ff0', '--mnx-border': '#d8dde3',
  },
  dark: {
    '--mnx-text': '#e7eaee', '--mnx-text-muted': '#a1a9b4', '--mnx-canvas': '#16181c', '--mnx-surface': '#1f2227', '--mnx-surface-2': '#2a2e34',
    '--mnx-accent': '#7aa2ff', '--mnx-accent-soft': '#26355a', '--mnx-accent-text': '#0b0e14', '--mnx-focus': '#7aa2ff', '--mnx-border': '#343941',
  },
};
const host = { extensionId: 'preview', surface: 'study', items: [], permissions: [], onComplete: () => {}, onExit: () => {} } as never;
const PAGES: Record<string, () => ReactNode> = {
  shapes: () => <ShapesExplorer />,
  'shapes-activity': () => <ShapesActivity host={host} />,
  key: () => <KeyActivity host={host} />,
  lewis: () => <LewisActivity host={host} structServiceProvider={offlineStructServiceProvider} />,
  'isomers-stereo': () => <IsomersActivity host={host} structServiceProvider={offlineStructServiceProvider} mode="stereo" />,
  'isomers-pairs': () => <IsomersActivity host={host} structServiceProvider={offlineStructServiceProvider} mode="pairs" />,
  'isomers-draw': () => <DrawIsomersActivity host={host} structServiceProvider={offlineStructServiceProvider} />,
  'spectra-peaks': () => <SpectraActivity host={host} structServiceProvider={offlineStructServiceProvider} mode="peaks" />,
  'spectra-which': () => <SpectraActivity host={host} structServiceProvider={offlineStructServiceProvider} mode="which" />,
  'spectra-solve': () => <SpectraActivity host={host} structServiceProvider={offlineStructServiceProvider} mode="solve" />,
  // Debugging: any document, read-only, with the editor API on window.__api.
  ket: () => <div style={{ height: '100vh' }}><MechanismEditor structServiceProvider={offlineStructServiceProvider} staticResourcesUrl=""
    ket={(window as unknown as { __ket: string }).__ket} capabilities="review"
    onReady={(api) => { api.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: true })); (window as unknown as { __api: unknown }).__api = api; }} /></div>,
  // A template's puzzle at seeds 1-16: `template-e1-3`. (`bun run times` with no pages times seeds 1 and 2.)
  ...Object.fromEntries(TEMPLATES.flatMap((template) => Array.from({ length: 16 }, (_, i) => i + 1).map((seed) => [`template-${template.id}-${seed}`,
    () => <LessonPlayer lesson={buildLesson(template.make(rngOf(seed)))} structServiceProvider={offlineStructServiceProvider} host={host} />]))),
  ...Object.fromEntries(LESSONS.map((lesson) => [lesson.id, () => <LessonPlayer lesson={buildLesson(lesson)} structServiceProvider={offlineStructServiceProvider} host={host} />])),
};

let root: Root | null = null;
(window as unknown as { previewPages: () => string[] }).previewPages = () => Object.keys(PAGES);
(window as unknown as { mountPreview: (page: string, scheme: 'light' | 'dark') => void }).mountPreview = (page, scheme) => {
  const html = document.documentElement;
  for (const [name, value] of Object.entries(THEMES[scheme])) html.style.setProperty(name, value);
  html.setAttribute('data-mnx-scheme', scheme);
  html.setAttribute('data-mnx-motion', 'reduced');
  html.style.colorScheme = scheme;
  document.body.style.margin = '0';
  document.body.style.background = 'var(--mnx-canvas)';
  let host = document.getElementById('root');
  if (!host) { host = document.createElement('div'); host.id = 'root'; host.style.height = '100vh'; document.body.append(host); }
  root?.unmount();
  root = createRoot(host);
  root.render(PAGES[page]());
};
