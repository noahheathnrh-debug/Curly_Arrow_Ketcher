import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { MechanismEditor, type MechanismEditorApi } from 'ketcher-react';
import type { StructServiceProvider } from 'ketcher-core';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { fitToView, loadFitted } from '../fitToView';
import { editorAtomId, readEditorStruct } from '../engine/drawn';
import { components } from '../engine/molecule';
import { subscripts } from '../isomers/cip';
import { EMPTY_KET, isomerKet, rowKet } from '../isomers/layouts';
import { carbonPeaks, formulaOfGraph, graphOfStructure, nominalMass, protonPeaks, splittingName, type SGraph } from './predict';
import { graphOf, groupLabel, peaksRound, solveRound, spectraDifference, whichRound, type PeaksQuestion, type WhichQuestion } from './questions';
import type { SpectraMolecule } from './species';
import { SpectraCharts, type SpectrumTab } from './SpectraCharts';
import lessonStyles from '../lessons/lessons.module.css';
import lewisStyles from '../lewis/lewis.module.css';
import styles from './spectra.module.css';

/**
 * Spectra (Molecules), three activities on spectra predicted from the structure (`predict.ts`):
 * - **How many peaks?** five molecules; how many peaks in the ¹H or ¹³C NMR spectrum. The answer colours each
 *   environment on the drawing and shows the spectrum.
 * - **Which molecule?** five unknowns; their four spectra and a few isomers of the same formula to choose from.
 * - **Draw the unknown:** two unknowns; draw any molecule whose predicted spectra match. A wrong drawing is told the
 *   first spectrum it would not match, and its own spectra can be compared with the unknown's.
 */
export type SpectraMode = 'peaks' | 'which' | 'solve';
export const ROUND_LENGTH = 5;
const ENV_COLOURS = ['#3a6ff0', '#c2402f', '#2f8f4e', '#d9822b', '#8e5bd0', '#1f9aa8', '#b8478a', '#7a6a2f'];
const POINT = '#3a6ff0';
const TITLES: Readonly<Record<SpectraMode, string>> = { peaks: 'How many peaks?', which: 'Which molecule?', solve: 'Draw the unknown' };
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Bond names such as N–H never break at their dash; formulas get their subscripts. */
const prose = (text: string) => subscripts(text).replace(/(\S)–(\S)/g, '$1\u2060–\u2060$2');

type Spec = Parameters<MechanismEditorApi['highlight']>[0][number];
interface Props { host: ExperienceHostProps; practice?: PracticeLaunch; structServiceProvider: StructServiceProvider; mode: SpectraMode; exitLabel?: string }

export function SpectraActivity(props: Props) {
  const { host, practice, mode } = props;
  const startedAt = useRef(Date.now());
  const tally = useRef({ best: 0, firstAll: false, rounds: 0, attempts: 0, solved: 0, solvedAll: false });
  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const tag = skill ? { skill } : {};
    const t = tally.current;
    const criteria: PracticeCriterion[] = mode === 'solve' ? [
      { id: 'spectra.solve.round', label: 'Both unknowns drawn without being shown', met: t.solvedAll, weight: 3, ...tag },
      { id: 'spectra.solve.one', label: 'At least one unknown drawn without being shown', met: t.solved >= 1, weight: 1, ...tag },
    ] : [
      { id: `spectra.${mode}.round`, label: `At least ${ROUND_LENGTH - 1} of ${ROUND_LENGTH} right`, met: t.best >= ROUND_LENGTH - 1, weight: 3, ...tag },
      { id: `spectra.${mode}.round-all`, label: `All ${ROUND_LENGTH} right in the first round`, met: t.firstAll, weight: 1, ...tag },
    ];
    host.onComplete({
      completed,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      ...(practice ? { practice: { version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: 0, attempts: t.attempts } } : {}),
    });
  }, [host, practice, mode]);
  return mode === 'solve' ? <SolvePlayer {...props} tally={tally} complete={complete} /> : <QuizPlayer {...props} tally={tally} complete={complete} />;
}

type Tally = MutableRefObject<{ best: number; firstAll: boolean; rounds: number; attempts: number; solved: number; solvedAll: boolean }>;
interface PlayerProps extends Props { tally: Tally; complete: (completed: boolean) => void }

/**
 * The editor, the KET it should show, and the highlights it should carry; loads and repaints as those change, and fits
 * the drawing again when `layout` changes (the spectra appearing above it make the canvas shorter).
 */
function useCanvas(ket: string | null, specs: Spec[], layout: unknown = null) {
  const api = useRef<MechanismEditorApi | null>(null);
  const shown = useRef(ket ?? EMPTY_KET);
  const first = useRef(shown.current);
  const specsRef = useRef(specs);
  specsRef.current = specs;
  const paint = useCallback(() => api.current?.highlight(specsRef.current), []);
  const load = useCallback((next: string) => {
    shown.current = next;
    const ready = api.current;
    if (!ready) return;
    ready.highlight([]);
    void loadFitted(ready, next).then(paint);
  }, [paint]);
  useEffect(() => { if (ket !== null && ket !== shown.current) load(ket); }, [ket, load]);
  useEffect(() => { paint(); }, [specs, paint]);
  useEffect(() => {
    const ready = api.current;
    if (!ready) return;
    const frame = requestAnimationFrame(() => { void fitToView(ready).then(paint); });
    return () => cancelAnimationFrame(frame);
  }, [layout, paint]);
  const onReady = (ready: MechanismEditorApi) => {
    api.current = ready;
    ready.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: false }));
    if (shown.current !== first.current) void loadFitted(ready, shown.current).then(paint);
    else requestAnimationFrame(() => { void fitToView(ready).then(paint); });
  };
  return { api, load, onReady, firstKet: first.current };
}

function Shell({ mode, list, at, outcomes, goTo, exitLabel, complete, panel, charts, canvas, viewOnly }: {
  mode: SpectraMode; list: { title: string }[]; at: number; outcomes: (string | undefined)[]; goTo: (i: number) => void; exitLabel?: string;
  complete: (completed: boolean) => void; panel: ReactNode; charts: ReactNode; canvas: ReactNode; viewOnly: boolean;
}) {
  return <div className={lessonStyles.player}>
    <header className={lessonStyles.bar}>
      <div className={lessonStyles.titles}>
        <span className={lessonStyles.unit}>Molecules · Spectra</span>
        <h1>{TITLES[mode]}</h1>
      </div>
      <ol className={lewisStyles.progress} aria-label="Questions in this round">
        {list.map((q, i) => <li key={`${q.title}-${i}`} data-state={outcomes[i] === 'wrong' ? 'shown' : outcomes[i] ?? (i === at ? 'current' : undefined)}>
          <button type="button" onClick={() => goTo(i)} aria-current={i === at ? 'step' : undefined} title={q.title}>{i + 1}</button>
        </li>)}
      </ol>
      <button type="button" className={lessonStyles.quiet} onClick={() => complete(false)}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={lessonStyles.body}>
      <div className={lessonStyles.split}>
        <section className={lessonStyles.panel} aria-live="polite">{panel}</section>
        <div className={styles.stage} data-charts={charts ? undefined : 'none'}>
          {charts}
          <main className={`${lessonStyles.canvas} ${viewOnly ? styles.viewOnly : ''}`}>{canvas}</main>
        </div>
      </div>
    </div>
  </div>;
}

function Verdict({ right, lead, children }: { right: boolean; lead: string; children?: ReactNode }) {
  return <div className={`${lessonStyles.message} ${right ? lessonStyles.right : lessonStyles.wrong}`} role="status">
    <p><strong>{lead}</strong></p>
    {children}
  </div>;
}

// ── How many peaks? and Which molecule? ─────────────────────────────────────────────────────────────────────────

type Question = { kind: 'peaks'; q: PeaksQuestion } | { kind: 'which'; q: WhichQuestion };

function QuizPlayer({ mode, structServiceProvider, exitLabel, tally, complete }: PlayerProps) {
  const [round, setRound] = useState(0);
  const list = useMemo<Question[]>(() => (mode === 'peaks' ? peaksRound(Math.random).map((q) => ({ kind: 'peaks' as const, q })) : whichRound(Math.random).map((q) => ({ kind: 'which' as const, q }))), [mode, round]);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<(string | undefined)[]>([]);
  const [tab, setTab] = useState<SpectrumTab>('h');
  const [pointed, setPointed] = useState<number[] | null>(null);
  const question = list[at];
  const given = answers[at];
  const answered = given !== undefined;

  const rightAnswer = (x: Question) => (x.kind === 'peaks' ? String(x.q.answer) : x.q.answer.smiles);
  const outcomes = list.map((x, i) => (answers[i] === undefined ? undefined : answers[i] === rightAnswer(x) ? 'right' : 'wrong'));
  const finished = outcomes.every(Boolean);
  const right = outcomes.filter((o) => o === 'right').length;

  const molecule = question.kind === 'peaks' ? question.q.molecule : question.q.answer;
  const graph = useMemo(() => graphOf(molecule), [molecule]);
  const envs = useMemo(() => (question.kind === 'peaks' ? (question.q.nucleus === 'H' ? protonPeaks(graph) : carbonPeaks(graph)).map((p) => p.atoms) : []), [question, graph]);

  const ket = question.kind === 'peaks' || answered ? isomerKet(molecule.smiles) : rowKet(question.q.options.map((o) => o.smiles), Math.min(4, question.q.options.length));
  const specs: Spec[] = !answered ? [] : pointed ? [{ atoms: pointed, color: POINT }]
    : question.kind === 'peaks' ? envs.map((atoms, i) => ({ atoms, color: ENV_COLOURS[i % ENV_COLOURS.length] })) : [];
  const showCharts = question.kind === 'which' || answered;
  const canvas = useCanvas(ket, specs, showCharts);

  const answer = (value: string) => {
    if (answered) return;
    tally.current.attempts += 1;
    const next = [...answers];
    next[at] = value;
    setAnswers(next);
    if (question.kind === 'peaks') setTab(question.q.nucleus === 'H' ? 'h' : 'c');
    if (list.every((_, i) => next[i] !== undefined)) {
      const score = list.filter((x, i) => next[i] === rightAnswer(x)).length;
      const t = tally.current;
      tally.current = { ...t, best: Math.max(t.best, score), firstAll: t.firstAll || (t.rounds === 0 && score === list.length), rounds: t.rounds + 1 };
    }
  };
  const goTo = (i: number) => { setAt(i); setPointed(null); if (mode === 'which') setTab('h'); };
  const again = () => { setRound((r) => r + 1); setAnswers([]); goTo(0); };
  const open = list.map((_, i) => i).filter((i) => !outcomes[i]);
  const nextOpen = open.find((i) => i > at) ?? open[0];

  const nucleus = question.kind === 'peaks' ? question.q.nucleus : 'H';
  const titles = list.map((x) => ({ title: x.kind === 'peaks' ? x.q.molecule.name : `Unknown ${formulaOfGraph(graphOf(x.q.answer))}` }));
  const panel = <>
    <span className={lessonStyles.counter}>{question.kind === 'peaks' ? 'Molecule' : 'Unknown'} {at + 1} of {list.length}</span>
    {question.kind === 'peaks' ? <>
      <h2>{capital(molecule.name)}</h2>
      {!answered && <>
        <p>How many peaks are in its {nucleus === 'H' ? '¹H' : '¹³C'} NMR spectrum?</p>
        <p className={lessonStyles.muted}>{nucleus === 'H'
          ? 'Count the sets of hydrogens in different environments. Hydrogens the molecule\'s symmetry swaps are one set; hydrogens on one carbon are one set.'
          : 'Count the carbons in different environments. Carbons the molecule\'s symmetry swaps give one peak.'}</p>
        <div className={styles.choices} role="group" aria-label="Number of peaks">
          {Array.from({ length: Math.max(6, question.q.answer + 2) }, (_, i) => String(i + 1)).map((n) => <button key={n} type="button" className={lessonStyles.quiet} onClick={() => answer(n)}>{n}</button>)}
        </div>
      </>}
      {answered && <Verdict right={given === String(question.q.answer)} lead={given === String(question.q.answer) ? `Right: ${question.q.answer}.` : `Not quite: ${question.q.answer} ${question.q.answer === 1 ? 'peak' : 'peaks'}.`}>
        <p>Each colour on the drawing is one environment:</p>
        <ul className={styles.envs}>{(nucleus === 'H' ? protonPeaks(graph) : carbonPeaks(graph)).map((p, i) => <li key={i}>
          <span className={styles.dot} style={{ background: ENV_COLOURS[i % ENV_COLOURS.length] }} aria-hidden />
          {subscripts(groupLabel(graph, p.atoms[0], nucleus))}{p.atoms.length > 1 ? ` ×${p.atoms.length}` : ''}
          {'count' in p ? ` · ${p.count}H · ${splittingName(p.next)} · δ ${p.shift.toFixed(1)}` : ` · δ ${Math.round(p.shift)}`}
        </li>)}</ul>
      </Verdict>}
    </> : <>
      <h2>Which molecule gave these spectra?</h2>
      <p>Formula <span className={styles.formula}>{subscripts(formulaOfGraph(graph))}</span>, molecular ion at m/z {nominalMass(graph)}.</p>
      {!answered && <>
        <p className={lessonStyles.muted}>Read the IR bands for the functional group, then the ¹H peaks: how many, their areas and their splitting. The four tabs above the drawings hold the spectra.</p>
        <div className={styles.options} role="group" aria-label="Your answer">
          {question.q.options.map((o) => <button key={o.smiles} type="button" className={lessonStyles.quiet} onClick={() => answer(o.smiles)}>{capital(o.name)}</button>)}
        </div>
      </>}
      {answered && <Verdict right={given === question.q.answer.smiles} lead={given === question.q.answer.smiles ? `Right: ${question.q.answer.name}.` : `Not quite: it is ${question.q.answer.name}.`}>
        <ul className={styles.facts}>{question.q.options.filter((o) => o.smiles !== question.q.answer.smiles).map((o) => <li key={o.smiles}>{prose(spectraDifference(graphOf(o), graph, capital(o.name)) ?? '')}</li>)}</ul>
        <p className={lessonStyles.muted}>Point at a peak to see which atoms give it.</p>
      </Verdict>}
    </>}
    {finished && <p className={lessonStyles.says}>{right} of {list.length} right.</p>}
    <div className={lessonStyles.actions}>
      {answered && nextOpen !== undefined && <button type="button" className={lessonStyles.primary} onClick={() => goTo(nextOpen)}>Next</button>}
      {finished && <>
        <button type="button" className={lessonStyles.primary} onClick={() => complete(true)}>Finish</button>
        <button type="button" className={lessonStyles.quiet} onClick={again}>Another round</button>
      </>}
    </div>
  </>;
  return <Shell mode={mode} list={titles} at={at} outcomes={outcomes} goTo={goTo} exitLabel={exitLabel} complete={complete} viewOnly
    panel={panel}
    charts={showCharts ? <SpectraCharts graph={graph} tab={tab} onTab={setTab} onFocus={answered ? setPointed : undefined} reveal={answered}
      tabs={question.kind === 'peaks' ? [nucleus === 'H' ? 'h' : 'c'] : undefined} title={question.kind === 'which' ? 'The unknown' : undefined} /> : null}
    canvas={<MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={canvas.firstKet} capabilities="review" onReady={canvas.onReady} />} />;
}

// ── Draw the unknown ────────────────────────────────────────────────────────────────────────────────────────────

type Drawn = { graph: SGraph; ids: string[] };
type Check = { kind: 'right' } | { kind: 'wrong'; text: string } | { kind: 'note'; text: string };

function SolvePlayer({ mode, structServiceProvider, exitLabel, tally, complete }: PlayerProps) {
  const [round, setRound] = useState(0);
  const tasks = useMemo<SpectraMolecule[]>(() => solveRound(Math.random), [round]);
  const [at, setAt] = useState(0);
  const [outcomes, setOutcomes] = useState<('right' | 'shown' | undefined)[]>([]);
  const [check, setCheck] = useState<Check | null>(null);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [view, setView] = useState<'unknown' | 'yours'>('unknown');
  const [tab, setTab] = useState<SpectrumTab>('ir');
  const [pointed, setPointed] = useState<number[] | null>(null);
  const [answerShown, setAnswerShown] = useState(false);
  const task = tasks[at];
  const target = useMemo(() => graphOf(task), [task]);
  const done = !!outcomes[at];
  const finished = tasks.every((_, i) => outcomes[i]);

  // Pointing at a peak lights its atoms: on the learner's drawing for their spectra, on the answer once it is shown.
  const specs: Spec[] = !pointed ? []
    : view === 'yours' && drawn ? [{ atoms: pointed.map((i) => editorAtomId(drawn.ids[i])), color: POINT }]
    : answerShown ? [{ atoms: pointed, color: POINT }] : [];
  const canvas = useCanvas(null, specs);

  const settle = (outcome: 'right' | 'shown') => {
    if (outcomes[at]) return;
    const next = [...outcomes];
    next[at] = outcome;
    setOutcomes(next);
    if (tasks.every((_, i) => next[i]) && tally.current.rounds === 0) {
      const solved = next.filter((o) => o === 'right').length;
      tally.current = { ...tally.current, solved, solvedAll: solved === tasks.length, rounds: 1 };
    }
  };
  const checkDrawing = () => {
    const ready = canvas.api.current;
    if (!ready || done) return;
    tally.current.attempts += 1;
    const struct = ready.ketcher.editor.struct() as never as Parameters<typeof readEditorStruct>[0];
    if (![...struct.atoms].length) { setCheck({ kind: 'note', text: 'Draw a molecule first.' }); return; }
    const read = readEditorStruct(struct);
    if ('outside' in read) { setCheck({ kind: 'note', text: `This drawing has something the checker does not read (${read.outside}). Draw rings with alternating single and double bonds.` }); return; }
    if ('invalid' in read) { setCheck({ kind: 'note', text: read.invalid[0]?.message ?? 'An atom has more bonds than it can make.' }); return; }
    if (components(read.structure).length > 1) { setCheck({ kind: 'note', text: 'Draw one molecule: there is more than one on the canvas.' }); return; }
    const mine = graphOfStructure(read.structure);
    setDrawn(mine);
    const difference = spectraDifference(mine.graph, target);
    if (difference === null) { setCheck({ kind: 'right' }); setView('yours'); settle('right'); return; }
    setCheck({ kind: 'wrong', text: difference });
  };
  const showAnswer = () => {
    canvas.load(isomerKet(task.smiles));
    setAnswerShown(true); setView('unknown'); setCheck(null);
    settle('shown');
  };
  const goTo = (i: number) => {
    setAt(i); setCheck(null); setDrawn(null); setView('unknown'); setTab('ir'); setPointed(null); setAnswerShown(false);
    canvas.load(EMPTY_KET);
  };
  const again = () => { setRound((r) => r + 1); setOutcomes([]); goTo(0); };

  const panel = <>
    <span className={lessonStyles.counter}>Unknown {at + 1} of {tasks.length}</span>
    <h2>Draw a molecule that gives these spectra</h2>
    <p>Formula <span className={styles.formula}>{subscripts(formulaOfGraph(target))}</span>, molecular ion at m/z {nominalMass(target)}.</p>
    {!done && <p className={lessonStyles.muted}>The IR bands say which functional group; the ¹H peaks say how many sets of hydrogens, how many in each (the areas) and how many on the carbons next door (the splitting). Draw it, then check.</p>}
    {check?.kind === 'right' && <Verdict right lead={`Right: your molecule gives these spectra. The unknown is ${task.name}.`}>
      <p className={lessonStyles.muted}>The spectra above are now your molecule's: point at a peak to see the atoms behind it.</p>
    </Verdict>}
    {check?.kind === 'wrong' && <Verdict right={false} lead="Not that one.">
      <p>{prose(check.text)}</p>
      <p className={lessonStyles.muted}>Compare your molecule's spectra with the unknown's using the switch above the spectra.</p>
    </Verdict>}
    {check?.kind === 'note' && <div className={`${lessonStyles.message} ${lessonStyles.wrong}`} role="status"><p>{check.text}</p></div>}
    {outcomes[at] === 'shown' && <Verdict right={false} lead={`It is ${task.name}, drawn on the canvas.`}>
      <p className={lessonStyles.muted}>Point at a peak to see which atoms give it.</p>
    </Verdict>}
    <div className={lessonStyles.actions}>
      {!done && <button type="button" className={lessonStyles.primary} onClick={checkDrawing}>Check</button>}
      {!done && <button type="button" className={lessonStyles.quiet} onClick={() => { canvas.load(EMPTY_KET); setCheck(null); setDrawn(null); setView('unknown'); }}>Clear</button>}
      {!done && <button type="button" className={lessonStyles.quiet} onClick={showAnswer}>Show the answer</button>}
      {done && !finished && <button type="button" className={lessonStyles.primary} onClick={() => goTo(tasks.findIndex((_, i) => !outcomes[i]))}>Next unknown</button>}
      {finished && <>
        <button type="button" className={lessonStyles.primary} onClick={() => complete(true)}>Finish</button>
        <button type="button" className={lessonStyles.quiet} onClick={again}>Another round</button>
      </>}
    </div>
  </>;
  const showing = view === 'yours' && drawn ? drawn.graph : target;
  const whose = drawn && check?.kind !== 'right' ? <div className={styles.whose} role="group" aria-label="Whose spectra">
    <button type="button" className={styles.tab} aria-pressed={view === 'unknown'} onClick={() => setView('unknown')}>The unknown</button>
    <button type="button" className={styles.tab} aria-pressed={view === 'yours'} onClick={() => setView('yours')}>Your molecule</button>
  </div> : null;
  const charts = <SpectraCharts graph={showing} tab={tab} onTab={setTab} onFocus={setPointed} lead={whose} reveal={view === 'yours' || done}
    title={whose ? undefined : view === 'yours' ? 'Your molecule' : 'The unknown'} />;
  return <Shell mode={mode} list={tasks.map((t) => ({ title: formulaOfGraph(graphOf(t)) }))} at={at} outcomes={outcomes} goTo={goTo} exitLabel={exitLabel}
    complete={complete} viewOnly={false} panel={panel} charts={charts}
    canvas={<MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={EMPTY_KET} capabilities="puzzle-construction" onReady={canvas.onReady} />} />;
}
