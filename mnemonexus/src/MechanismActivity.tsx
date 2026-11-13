import { useCallback, useMemo, useRef, useState } from 'react';
import {
  MechanismEditor,
  type MechanismArrowChange,
  type MechanismEditorApi,
} from 'ketcher-react';
import {
  arrowTouches,
  matchArrowSet,
  type MechanismArrowDescriptor,
  type MechanismPuzzle,
  type StructServiceProvider,
} from 'ketcher-core';

import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import { PUZZLES } from './puzzles';
import { acceptableSets } from './alternatives';
import { ENZYME_STAGE_LABELS, isEnzymePuzzle } from './enzymes';
import type { KetcherArrowDescriptor } from './engine/arrows';
import { checkDrawnArrows, type DrawnCheck } from './engine/drawn';
import type { ExperienceHostProps } from './hostContract';
import styles from './activity.module.css';
import { fitToView } from './fitToView';

/** Wrong arrows are shaded; right ones are left alone, so the canvas stays calm. */
const WRONG = '#c2402f';

/** The best reading of what was drawn: a complete match if any set gives one, else the set it is nearest to. */
function bestMatch(drawn: MechanismArrowDescriptor[], sets: readonly MechanismArrowDescriptor[][]) {
  const results = sets.map((set) => matchArrowSet(drawn, [...set]));
  return results.find((result) => result.complete)
    ?? results.reduce((best, result) => (result.extra.length < best.extra.length || (result.extra.length === best.extra.length && result.missing.length < best.missing.length) ? result : best));
}

interface Props extends ExperienceHostProps {
  selectedPuzzles?: readonly MechanismPuzzle[];
  exitLabel?: string;
  draft?: { puzzleId: string; stepIndex: number; ket: string; hintsShown: number; attempts: number; hintsTotal?: number; wrongSteps?: string[]; elapsedSeconds?: number };
  /** practice-v1: set when the host chose this activity; the run then reports what happened. */
  practice?: PracticeLaunch;
  onSaveDraft?: (draft: string) => Promise<void>;
  structServiceProvider: StructServiceProvider;
  staticResourcesUrl: string;
}

type StepState = 'unanswered' | 'partial' | 'wrong' | 'solved';

/**
 * A mechanism exercise.
 *
 * Everything pedagogical lives here — which puzzle, what counts as an answer,
 * what to say about a wrong one, when the run is over. The editor is only asked
 * to hold the structure still and report what the learner drew.
 *
 * Note what this component never does: it does not render an arrow, compute a
 * curve, or reason about geometry. All of that is the editor's, which is the
 * whole point of embedding it rather than reimplementing it.
 */
export const MechanismActivity = ({
  structServiceProvider,
  staticResourcesUrl,
  surface,
  onComplete,
  onExit,
  study,
  draft,
  onSaveDraft,
  selectedPuzzles,
  exitLabel,
  practice,
}: Props) => {
  const puzzles = useMemo(() => selectedPuzzles ?? (study ? PUZZLES.filter((p) => p.id === study.taskId) : PUZZLES), [study, selectedPuzzles]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(draft?.stepIndex ?? 0);
  const [state, setState] = useState<StepState>('unanswered');
  const [message, setMessage] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(draft?.hintsShown ?? 0);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

  const apiRef = useRef<MechanismEditorApi | null>(null);
  const startedAt = useRef(Date.now());
  const attempts = useRef(draft?.attempts ?? 0);
  // Hints shown across every step, and steps with a wrong arrow: hintsShown resets on each step.
  const hintsTotal = useRef(draft?.hintsTotal ?? draft?.hintsShown ?? 0);
  const wrongSteps = useRef(new Set(draft?.wrongSteps ?? []));
  const elapsedBefore = useRef(draft?.elapsedSeconds ?? 0);
  const elapsedSeconds = () => elapsedBefore.current + Math.round((Date.now() - startedAt.current) / 1000);
  const saveQueue = useRef(Promise.resolve());
  const saveState = useRef({ stepIndex, hintsShown });
  saveState.current = { stepIndex, hintsShown };
  const initialKet = useRef(draft?.ket);
  const [saveError, setSaveError] = useState<string | null>(null);

  const puzzle: MechanismPuzzle = puzzles[puzzleIndex];
  const step = puzzle.steps[stepIndex];
  const isLastStep = stepIndex === puzzle.steps.length - 1;
  const isLastPuzzle = puzzleIndex === puzzles.length - 1;
  const saveDraft = useCallback(() => {
    const api = apiRef.current;
    if (!api || !onSaveDraft) return saveQueue.current;
    // Capture now, then serialize acknowledged writes to avoid stale async exports winning.
    const ket = api.getKet();
    const meta = { puzzleId: puzzle.id, ...saveState.current, attempts: attempts.current, hintsTotal: hintsTotal.current, wrongSteps: [...wrongSteps.current], elapsedSeconds: elapsedSeconds() };
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      await onSaveDraft(JSON.stringify({ ...meta, ket: await ket }));
      setSaveError(null);
    }).catch((error) => {
      setSaveError(error instanceof Error ? error.message : 'The exercise could not be saved.');
      throw error;
    });
    return saveQueue.current;
  }, [onSaveDraft, puzzle.id]);

  // Steps before this one have already been answered, so their arrows are still
  // on the canvas and must count towards the expected set — otherwise answering
  // step two would report step one's arrows as unexpected extras.
  const expectedSets = useMemo(() => acceptableSets(puzzle.steps, stepIndex), [puzzle, stepIndex]);

  const showFeedback = useCallback(
    (drawn: readonly MechanismArrowDescriptor[], wrong: number[]) => {
      const api = apiRef.current;
      if (!api) return;

      const wrongAtoms: number[] = [];
      const wrongBonds: number[] = [];
      wrong.forEach((index) => {
        const touched = arrowTouches(drawn[index]);
        wrongAtoms.push(...touched.atoms);
        wrongBonds.push(...touched.bonds);
      });

      api.highlight(
        wrongAtoms.length || wrongBonds.length
          ? [{ atoms: wrongAtoms, bonds: wrongBonds, color: WRONG }]
          : [],
      );
    },
    [],
  );

  /**
   * The chemistry engine's reading of what is drawn: an arrow that cannot be drawn at all (no electrons where it
   * starts), and what the whole set would lead to. Null when the structure is outside what the engine models (an
   * enzyme scene with a metal or a residue label); the answer key alone then judges.
   */
  const legality = useCallback((drawn: readonly MechanismArrowDescriptor[]): DrawnCheck | null => {
    const api = apiRef.current;
    if (!api || !drawn.length) return null;
    try {
      return checkDrawnArrows(api.ketcher.editor.struct(), drawn as unknown as KetcherArrowDescriptor[]);
    } catch {
      return null;
    }
  }, []);

  const handleArrowsChange = useCallback(
    (change: MechanismArrowChange) => {
      const drawn = change.arrows;
      if (apiRef.current && change.added.length) attempts.current += change.added.length;
      void saveDraft().catch(() => undefined);
      const result = bestMatch([...drawn], expectedSets);

      if (result.complete) {
        setState('solved');
        setMessage(step.explanation ?? 'Correct.');
        apiRef.current?.highlight([]);
        return;
      }

      // An arrow that breaks an electron rule is wrong however the answer goes on, so say which rule at once.
      const check = legality(drawn);
      if (check?.refused && drawn[check.refused.index]) {
        if (change.added.length) wrongSteps.current.add(`${puzzle.id}:${stepIndex}`);
        setState('wrong');
        setMessage(check.refused.message);
        showFeedback(drawn, [check.refused.index]);
        return;
      }

      if (result.extra.length > 0) {
        if (change.added.length) wrongSteps.current.add(`${puzzle.id}:${stepIndex}`);
        setState('wrong');
        // A legal arrow that is not in the answer: if the set breaks a rule (ten electrons on carbon), that is why.
        const why = check?.pending[0]?.message;
        setMessage(
          (result.extra.length === 1
            ? 'That arrow is not part of this mechanism. The highlighted atoms are where it points.'
            : 'Some of those arrows are not part of this mechanism.') + (why ? ` ${why}` : ''),
        );
        showFeedback(drawn, result.extra);
        return;
      }

      // Nothing wrong, just not finished — say so without implying a mistake.
      apiRef.current?.highlight([]);
      if (result.matched.length === 0) {
        setState('unanswered');
        setMessage(null);
      } else {
        setState('partial');
        setMessage(
          `${result.missing.length} more arrow${
            result.missing.length === 1 ? '' : 's'
          } to go.`,
        );
      }
    },
    [expectedSets, showFeedback, legality, step, saveDraft, puzzle.id, stepIndex],
  );

  /**
   * Two checks per step: the arrows, worth most, and getting there without a wrong one. An enzyme mechanism names each
   * step for what it shows ("His57 takes the proton from Ser195"), so the journal says what was right in plain words.
   */
  const practiceResult = useCallback((solvedThrough: { puzzle: number; step: number } | null) => {
    if (!practice) return undefined;
    const skill = typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const steps = puzzles.flatMap((entry, p) => entry.steps.map((_, s) => ({ entry, p, s })));
    const misconceptions: string[] = [];
    const criteria: PracticeCriterion[] = steps.flatMap(({ entry, p, s }) => {
      const solved = solvedThrough !== null && (p < solvedThrough.puzzle || (p === solvedThrough.puzzle && s <= solvedThrough.step));
      const plain = ENZYME_STAGE_LABELS[entry.id]?.[s];
      const name = plain ?? (steps.length === 1 ? 'The arrows' : `Step ${steps.findIndex((row) => row.p === p && row.s === s) + 1}`);
      const clean = solved && !wrongSteps.current.has(`${entry.id}:${s}`);
      if (plain && wrongSteps.current.has(`${entry.id}:${s}`)) misconceptions.push(`Needed a second try: ${plain}`.slice(0, 120));
      return [
        { id: `${entry.id}.${s}.drawn`, label: `${name}: every arrow right`.slice(0, 200), met: solved, weight: 3, ...(skill ? { skill } : {}) },
        { id: `${entry.id}.${s}.clean`, label: `${name}: no wrong arrow on the way`.slice(0, 200), met: clean, weight: 1, ...(skill ? { skill } : {}) },
      ];
    });
    return {
      version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: hintsTotal.current, attempts: attempts.current,
      ...(misconceptions.length ? { misconceptions: misconceptions.slice(0, 32) } : {}),
    };
  }, [practice, puzzles]);

  const giveUp = useCallback(() => {
    const solvedThrough = stepIndex > 0 ? { puzzle: puzzleIndex, step: stepIndex - 1 } : puzzleIndex > 0 ? { puzzle: puzzleIndex - 1, step: Number.MAX_SAFE_INTEGER } : null;
    onComplete({ completed: false, elapsedSeconds: elapsedSeconds(), practice: practiceResult(solvedThrough) });
  }, [onComplete, practiceResult, puzzleIndex, stepIndex]);

  const goToNext = useCallback(async () => {
    // Re-read the editor at the action boundary: a stale rendered button state
    // must not advance after the learner has changed their arrows.
    if (!apiRef.current || !bestMatch(apiRef.current.getArrows(), expectedSets).complete) return;
    const nowSolved = solvedIds.includes(puzzle.id)
      ? solvedIds
      : [...solvedIds, puzzle.id];
    setSolvedIds(nowSolved);

    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      setState('unanswered');
      setMessage(null);
      setHintsShown(0);
      return;
    }

    if (isLastPuzzle) {
      try { await saveDraft(); } catch { return; }
      onComplete({
        completed: true,
        elapsedSeconds: elapsedSeconds(),
        completedStages: nowSolved,
        practice: practiceResult({ puzzle: puzzleIndex, step: stepIndex }),
        studyEvidence: study && !practice ? {
          runId: study.runId, taskId: study.taskId, contextFingerprint: study.contextFingerprint,
          solvedStepIds: puzzle.steps.map((_, index) => `${puzzle.id}:step-${index + 1}`), attempts: attempts.current, hintsUsed: hintsTotal.current,
        } : undefined,
        // The host requires a grade when this ran as a recall review. Hints are
        // the only signal available here, so a hinted answer scores lower than
        // an unaided one.
        quality: surface === 'recall' ? (hintsTotal.current === 0 ? 5 : 3) : undefined,
      });
      return;
    }

    setPuzzleIndex((index) => index + 1);
    setStepIndex(0);
    setState('unanswered');
    setMessage(null);
    setHintsShown(0);
  }, [
    expectedSets,
    hintsShown,
    isLastPuzzle,
    isLastStep,
    onComplete,
    puzzle.id,
    puzzleIndex,
    solvedIds,
    stepIndex,
    surface,
    study,
    practice,
    practiceResult,
    puzzle.steps,
    saveDraft,
  ]);

  const hints = step.hints ?? [];
  const enzyme = isEnzymePuzzle(puzzle);

  return (
    <div className={styles.layout}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.progress}>
            {enzyme ? 'Mechanism step' : 'Puzzle'} {puzzleIndex + 1} of {puzzles.length}
            {puzzle.steps.length > 1 &&
              ` · ${enzyme ? 'part' : 'step'} ${stepIndex + 1} of ${puzzle.steps.length}`}
          </p>
          <h1 className={styles.title}>{puzzle.title}</h1>
          {puzzle.difficulty && (
            <span className={styles.badge}>{puzzle.difficulty}</span>
          )}
        </header>

        {step.prompt && <p className={styles.prompt}>{step.prompt}</p>}
        {enzyme && puzzle.provenance?.note && <p className={styles.modelNote} data-testid="model-note">{puzzle.provenance.note}</p>}
        {saveError && <p role="alert">{saveError}</p>}

        {message && (
          <p className={`${styles.message} ${styles[state]}`}>{message}</p>
        )}

        {hints.length > 0 && (
          <section className={styles.hints}>
            {hints.slice(0, hintsShown).map((hint) => (
              <p key={hint} className={styles.hint}>
                {hint}
              </p>
            ))}
            {hintsShown < hints.length && state !== 'solved' && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  saveState.current.hintsShown = hintsShown + 1;
                  hintsTotal.current += 1;
                  setHintsShown(hintsShown + 1);
                  void saveDraft().catch(() => undefined);
                }}
              >
                {hintsShown === 0 ? 'Give me a hint' : 'Another hint'}
              </button>
            )}
          </section>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            disabled={state !== 'solved'}
            onClick={goToNext}
          >
            {isLastPuzzle && isLastStep ? 'Finish' : 'Next'}
          </button>
          {practice && state !== 'solved' && (
            <button type="button" className={styles.secondary} onClick={giveUp}>I can&apos;t do this one</button>
          )}
          <button type="button" className={styles.secondary} onClick={async () => { try { await saveDraft(); onExit(); } catch { /* Save error remains visible. */ } }}>
            {study ? 'Return to session' : exitLabel ?? 'Exit'}
          </button>
        </div>

        {enzyme && puzzle.provenance?.source && (
          <details className={styles.source}>
            <summary>Where this step comes from</summary>
            <p>{puzzle.provenance.source}</p>
          </details>
        )}

        <p className={styles.note}>
          The structure is locked. Draw curly arrows (fishhooks for single
          electrons); pan, zoom, explicit hydrogens and lone pairs all still
          work.
        </p>
      </aside>

      <main className={styles.canvas}>
        <MechanismEditor
          key={puzzle.id}
          structServiceProvider={structServiceProvider}
          staticResourcesUrl={staticResourcesUrl}
          ket={puzzleIndex === 0 ? initialKet.current ?? puzzle.document : puzzle.document}
          capabilities="puzzle-arrow-only"
          errorHandler={(error) => {
            setState('wrong');
            setMessage(error);
          }}
          onReady={(api) => {
            apiRef.current = api;
            api.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: true }));
            requestAnimationFrame(() => void fitToView(api));
            // The editor installs its change watcher after the initial document load.
            // Re-evaluate restored arrows explicitly rather than showing an unanswered draft.
            handleArrowsChange({ arrows: api.getArrows(), added: [], removed: [] });
          }}
          onArrowsChange={handleArrowsChange}
        />
      </main>
    </div>
  );
};
