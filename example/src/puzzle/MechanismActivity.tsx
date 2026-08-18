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

import { PUZZLES } from './puzzles';
import type { ExperienceHostProps } from './hostContract';
import styles from './activity.module.css';

/** Wrong arrows are shaded; right ones are left alone, so the canvas stays calm. */
const WRONG = '#c2402f';

interface Props extends ExperienceHostProps {
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
}: Props) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<StepState>('unanswered');
  const [message, setMessage] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

  const apiRef = useRef<MechanismEditorApi | null>(null);
  const startedAt = useRef(Date.now());

  const puzzle: MechanismPuzzle = PUZZLES[puzzleIndex];
  const step = puzzle.steps[stepIndex];
  const isLastStep = stepIndex === puzzle.steps.length - 1;
  const isLastPuzzle = puzzleIndex === PUZZLES.length - 1;

  // Steps before this one have already been answered, so their arrows are still
  // on the canvas and must count towards the expected set — otherwise answering
  // step two would report step one's arrows as unexpected extras.
  const expectedSoFar = useMemo(
    () =>
      puzzle.steps
        .slice(0, stepIndex + 1)
        .flatMap((s) => [...s.expectedArrows]),
    [puzzle, stepIndex],
  );

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

  const handleArrowsChange = useCallback(
    (change: MechanismArrowChange) => {
      const drawn = change.arrows;
      const result = matchArrowSet([...drawn], expectedSoFar);

      if (result.complete) {
        setState('solved');
        setMessage(step.explanation ?? 'Correct.');
        apiRef.current?.highlight([]);
        return;
      }

      if (result.extra.length > 0) {
        setState('wrong');
        setMessage(
          result.extra.length === 1
            ? 'That arrow is not part of this mechanism. The highlighted atoms are where it points.'
            : 'Some of those arrows are not part of this mechanism.',
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
    [expectedSoFar, showFeedback, step],
  );

  const goToNext = useCallback(() => {
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
      onComplete({
        completed: true,
        elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        completedStages: nowSolved,
        // The host requires a grade when this ran as a recall review. Hints are
        // the only signal available here, so a hinted answer scores lower than
        // an unaided one.
        quality: surface === 'recall' ? (hintsShown === 0 ? 5 : 3) : undefined,
      });
      return;
    }

    setPuzzleIndex((index) => index + 1);
    setStepIndex(0);
    setState('unanswered');
    setMessage(null);
    setHintsShown(0);
  }, [
    hintsShown,
    isLastPuzzle,
    isLastStep,
    onComplete,
    puzzle.id,
    solvedIds,
    surface,
  ]);

  const hints = step.hints ?? [];

  return (
    <div className={styles.layout}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.progress}>
            Puzzle {puzzleIndex + 1} of {PUZZLES.length}
            {puzzle.steps.length > 1 &&
              ` · step ${stepIndex + 1} of ${puzzle.steps.length}`}
          </p>
          <h1 className={styles.title}>{puzzle.title}</h1>
          {puzzle.difficulty && (
            <span className={styles.badge}>{puzzle.difficulty}</span>
          )}
        </header>

        {step.prompt && <p className={styles.prompt}>{step.prompt}</p>}

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
                onClick={() => setHintsShown((count) => count + 1)}
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
          <button type="button" className={styles.secondary} onClick={onExit}>
            Exit
          </button>
        </div>

        <p className={styles.note}>
          The structure is locked. Draw curly arrows; pan, zoom, explicit
          hydrogens and lone pairs all still work.
        </p>
      </aside>

      <main className={styles.canvas}>
        <MechanismEditor
          key={puzzle.id}
          structServiceProvider={structServiceProvider}
          staticResourcesUrl={staticResourcesUrl}
          ket={puzzle.document}
          capabilities={step.profile ?? 'puzzle-arrow-only'}
          onReady={(api) => {
            apiRef.current = api;
          }}
          onArrowsChange={handleArrowsChange}
        />
      </main>
    </div>
  );
};
