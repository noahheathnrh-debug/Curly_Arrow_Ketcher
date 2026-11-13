import './sandboxShims';
import './raphaelShim';
import { createRoot } from 'react-dom/client';
import { getExperienceHost, type ExperienceHost } from '@mnemonexus/addon-sdk';
import type { MechanismPuzzle } from 'ketcher-core';
import 'ketcher-react/dist/index.css';
import './index.css';
import { MechanismActivity } from './MechanismActivity';
import { offlineStructServiceProvider } from './offlineStructService';
import { LevelBrowser } from './LevelBrowser';
import { buildLevels, type ImportedExercise } from './catalogue';
import { PUZZLES } from './puzzles';
import { ENZYME_LEVELS } from './enzymes';
import { setIndigoWasmSource } from './indigo/indigoModule';
import { LESSONS } from './lessons';
import { buildLesson } from './lessons/kit';
import { LessonPlayer } from './lessons/LessonPlayer';
import { freshPuzzles } from './practice/generate';
import { ShapesActivity } from './molecules/ShapesActivity';
import { KeyActivity } from './key/KeyActivity';
import { LewisActivity } from './lewis/LewisActivity';
import { IsomersActivity } from './isomers/IsomersActivity';
import { DrawIsomersActivity } from './isomers/DrawIsomersActivity';
import { SpectraActivity } from './spectra/SpectraActivity';

/**
 * The add-on is started by practice-v1 only (0.6.0): the host picks an activity from the catalogue and hands back its
 * `launch`. There is no study task or learning contribution; the standalone surface is the level browser.
 */

/** practice-v1: the host chose an activity from the catalogue; its `launch` says which. */
async function renderPractice(host: ExperienceHost) {
  const launch = host.props.practice!.launch as { kind?: string; mode?: string; puzzle?: string; level?: string; activity?: string; lesson?: string; template?: string; count?: number };
  if (launch.kind === 'key') {
    createRoot(host.root).render(<KeyActivity host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice} />);
    return;
  }
  if (launch.kind === 'lewis') {
    createRoot(host.root).render(<LewisActivity host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice}
      structServiceProvider={offlineStructServiceProvider} />);
    return;
  }
  if (launch.kind === 'isomers' && launch.mode === 'draw') {
    createRoot(host.root).render(<DrawIsomersActivity host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice}
      structServiceProvider={offlineStructServiceProvider} />);
    return;
  }
  if (launch.kind === 'isomers') {
    // The molecules were laid out by Indigo ahead of time (src/isomers/layouts.json), so nothing needs to start here.
    createRoot(host.root).render(<IsomersActivity host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice}
      structServiceProvider={offlineStructServiceProvider} mode={launch.mode === 'pairs' ? 'pairs' : 'stereo'} />);
    return;
  }
  if (launch.kind === 'spectra') {
    // Spectra are predicted from the structure in `src/spectra/predict.ts`; the molecules are laid out ahead of time.
    const mode = launch.mode === 'which' || launch.mode === 'solve' ? launch.mode : 'peaks';
    createRoot(host.root).render(<SpectraActivity host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice}
      structServiceProvider={offlineStructServiceProvider} mode={mode} />);
    return;
  }
  if (launch.kind === 'shapes') {
    createRoot(host.root).render(<ShapesActivity host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice} />);
    return;
  }
  if (launch.kind === 'generated') {
    // New molecules every time: a repeat in Recall is a new puzzle of the same mechanism, not a remembered one.
    const puzzles = freshPuzzles(String(launch.template), Math.min(10, Math.max(1, Number(launch.count) || 3)), Date.now());
    if (!puzzles.length) throw new Error('This practice set is not in the add-on.');
    mountActivity(host, puzzles);
    return;
  }
  if (launch.kind === 'lesson') {
    const lesson = LESSONS.find((entry) => entry.id === launch.lesson);
    if (!lesson) throw new Error('This lesson is not in the add-on.');
    createRoot(host.root).render(<LessonPlayer lesson={buildLesson(lesson)} structServiceProvider={offlineStructServiceProvider}
      host={{ ...host.props, onComplete: host.complete, onExit: host.exit }} practice={host.props.practice} />);
    return;
  }
  if (launch.kind === 'enzyme') {
    const enzyme = ENZYME_LEVELS.find((entry) => entry.id === launch.activity);
    if (!enzyme) throw new Error('This enzyme mechanism is not in the add-on.');
    mountActivity(host, enzyme.puzzles);
    return;
  }
  if (launch.kind === 'guided') {
    const puzzle = PUZZLES.find((entry) => entry.id === launch.puzzle);
    if (!puzzle) throw new Error('This mechanism is not in the add-on.');
    mountActivity(host, [puzzle]);
    return;
  }
  const imported = await importedLevels(host);
  const level = buildLevels(PUZZLES, imported, ENZYME_LEVELS).find((entry) => entry.id === launch.level);
  if (!level) throw new Error('This mechanism level is not in the add-on.');
  mountActivity(host, level.puzzles);
}

/** The recovered corpus ships only in private builds; a public pack has none. */
async function importedLevels(host: ExperienceHost): Promise<ImportedExercise[]> {
  try { return JSON.parse(new TextDecoder().decode(await host.asset('assets/ocra-puzzles.json'))) as ImportedExercise[]; }
  catch { return []; }
}

function mountActivity(host: ExperienceHost, puzzles: readonly MechanismPuzzle[]) {
  createRoot(host.root).render(
    <MechanismActivity
      extensionId={host.props.extensionId}
      surface={host.props.surface}
      items={host.props.items}
      permissions={host.props.permissions}
      selectedPuzzles={puzzles}
      practice={host.props.practice}
      onComplete={host.complete}
      onExit={host.exit}
      structServiceProvider={offlineStructServiceProvider}
      staticResourcesUrl=""
    />,
  );
}

async function renderStandalone(host: ExperienceHost) {
  // Indigo's WebAssembly is read from the pack only when an activity first asks for chemistry (src/indigo/).
  setIndigoWasmSource(() => host.asset('assets/indigo.wasm'));
  if (host.props.practice) { await renderPractice(host); return; }
  const imported = await importedLevels(host);
  createRoot(host.root).render(<LevelBrowser host={host} levels={buildLevels(PUZZLES, imported, ENZYME_LEVELS)} />);
}

void renderStandalone(getExperienceHost());
