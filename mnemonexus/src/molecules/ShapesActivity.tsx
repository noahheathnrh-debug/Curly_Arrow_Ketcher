import { useCallback, useMemo, useRef, useState } from 'react';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { buildGeometry, vseprShape, type Centre, type Geometry } from '../engine/geometry3d';
import { buildStructure } from '../engine/molecule';
import { MoleculeViewer } from './MoleculeViewer';
import { ShapesExplorer } from './ShapesExplorer';
import { SHAPE_EXAMPLES, type ShapeExample } from './shapes';
import lessonStyles from '../lessons/lessons.module.css';
import styles from './molecules.module.css';

/**
 * Shapes in 3D (Molecules): explore the textbook set, then a short quiz. Each question names a molecule and asks for
 * its shape before showing it, so the learner predicts from the electron domains rather than reading the model; the
 * model then appears, lone pairs and all, with the reason.
 */
export const QUIZ_LENGTH = 5;
type Stage = 'explore' | 'quiz';

export interface ShapeQuestion { example: ShapeExample; geometry: Geometry; centre: Centre; options: string[] }

const shuffle = <T,>(xs: readonly T[], random: () => number): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const ALL_SHAPES = [...new Set([2, 3, 4, 5, 6].flatMap((d) => [0, 1, 2, 3].map((lp) => vseprShape(d - lp, lp).shape)).filter((s): s is string => !!s))];

/**
 * Four choices for a centre: its shape, the shapes with the same number of bonded atoms (the usual confusion, such as
 * trigonal planar against trigonal pyramidal), then others.
 */
export function shapeOptions(centre: Centre, random: () => number): string[] {
  const right = centre.shape!;
  const bonded = centre.domains - centre.lonePairs;
  const near = [0, 1, 2, 3].map((lp) => vseprShape(bonded, lp).shape).filter((s): s is string => !!s && s !== right);
  const far = shuffle(ALL_SHAPES.filter((s) => s !== right && !near.includes(s)), random);
  return shuffle([right, ...[...new Set(shuffle(near, random))], ...far].slice(0, 4), random);
}

export function shapeQuestions(count: number, random: () => number): ShapeQuestion[] {
  return shuffle(SHAPE_EXAMPLES, random).slice(0, count).map((example) => {
    const { structure } = buildStructure(example.spec, 'structure', { expandedOctets: true });
    const geometry = buildGeometry(structure!);
    const centre = geometry.centres.find((c) => c.atom === 'X')!;
    return { example, geometry, centre, options: shapeOptions(centre, random) };
  });
}

interface Props { host: ExperienceHostProps; practice?: PracticeLaunch; exitLabel?: string }

export function ShapesActivity({ host, practice, exitLabel }: Props) {
  const [stage, setStage] = useState<Stage>('explore');
  const startedAt = useRef(Date.now());
  const best = useRef({ right: 0, first: false, rounds: 0 });
  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const tag = skill ? { skill } : {};
    const criteria: PracticeCriterion[] = [
      { id: 'shapes.quiz', label: `Quiz: at least ${QUIZ_LENGTH - 1} of ${QUIZ_LENGTH} shapes right`, met: best.current.right >= QUIZ_LENGTH - 1, weight: 3, ...tag },
      { id: 'shapes.quiz-all', label: `Quiz: all ${QUIZ_LENGTH} right in the first round`, met: best.current.first, weight: 1, ...tag },
    ];
    host.onComplete({
      completed,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      ...(practice ? { practice: { version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: 0, attempts: best.current.rounds } } : {}),
    });
  }, [host, practice]);

  return <div className={lessonStyles.player}>
    <header className={lessonStyles.bar}>
      <div className={lessonStyles.titles}>
        <span className={lessonStyles.unit}>Molecules</span>
        <h1>Shapes in 3D</h1>
      </div>
      <nav className={lessonStyles.stages} aria-label="Stages">
        {(['explore', 'quiz'] as const).map((s, i) => <button key={s} type="button" aria-current={stage === s ? 'step' : undefined}
          className={lessonStyles.stage} onClick={() => setStage(s)}>
          <span className={lessonStyles.stageNumber}>{i + 1}</span>{s === 'explore' ? 'Explore' : 'Quiz'}
        </button>)}
      </nav>
      {stage === 'explore' && <button type="button" className={lessonStyles.primary} onClick={() => setStage('quiz')}>Start the quiz</button>}
      <button type="button" className={lessonStyles.quiet} onClick={() => complete(false)}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={lessonStyles.body}>
      {stage === 'explore' ? <ShapesExplorer /> : <Quiz onRound={(right) => {
        const first = best.current.rounds === 0;
        best.current = { right: Math.max(best.current.right, right), first: best.current.first || (first && right === QUIZ_LENGTH), rounds: best.current.rounds + 1 };
      }} onFinish={() => complete(true)} />}
    </div>
  </div>;
}

function Quiz({ onRound, onFinish }: { onRound: (right: number) => void; onFinish: () => void }) {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => shapeQuestions(QUIZ_LENGTH, Math.random), [round]);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const question = questions[at];
  const answer = answers[at];
  const right = answers.filter((a, i) => a === questions[i].centre.shape).length;
  const finished = answers.length === questions.length && at === questions.length - 1 && !!answer;

  const choose = (option: string) => {
    if (answer) return;
    const next = [...answers, option];
    setAnswers(next);
    if (next.length === questions.length) onRound(next.filter((a, i) => a === questions[i].centre.shape).length);
  };
  const again = () => { setRound((r) => r + 1); setAt(0); setAnswers([]); };
  const bonded = question.centre.domains - question.centre.lonePairs;

  return <div className={lessonStyles.split}>
    <section className={lessonStyles.panel} aria-live="polite">
      <span className={lessonStyles.counter}>Question {at + 1} of {questions.length}</span>
      <h2>{question.example.name} <span className={styles.formula}>{question.example.formula}</span></h2>
      <p>What shape is it?</p>
      <div className={styles.options} role="group" aria-label="Shapes">
        {question.options.map((option) => <button key={option} type="button" className={styles.option} disabled={!!answer}
          data-state={answer ? option === question.centre.shape ? 'right' : option === answer ? 'wrong' : undefined : undefined}
          onClick={() => choose(option)}>{option}</button>)}
      </div>
      {answer && <p className={`${lessonStyles.message} ${answer === question.centre.shape ? lessonStyles.right : lessonStyles.wrong}`}>
        {answer === question.centre.shape ? 'Right. ' : `It is ${question.centre.shape}. `}
        {question.centre.domains} electron domains around the centre: {bonded} bonded {bonded === 1 ? 'atom' : 'atoms'}
        {question.centre.lonePairs ? ` and ${question.centre.lonePairs} lone ${question.centre.lonePairs === 1 ? 'pair' : 'pairs'}` : ''}.
        {' '}Bond angle {question.centre.ideal}.
      </p>}
      {answer && question.example.note && <p className={lessonStyles.muted}>{question.example.note}</p>}
      {!answer && <p className={lessonStyles.hint}>Count the electron domains around the central atom: each bonded atom is one (a double bond counts once), and so is each lone pair.</p>}
      {finished && <p className={lessonStyles.says}>{right} of {questions.length} right.</p>}
      <div className={lessonStyles.actions}>
        {answer && !finished && <button type="button" className={lessonStyles.primary} onClick={() => setAt(at + 1)}>Next</button>}
        {finished && <>
          <button type="button" className={lessonStyles.primary} onClick={onFinish}>Finish</button>
          <button type="button" className={lessonStyles.quiet} onClick={again}>New questions</button>
        </>}
      </div>
    </section>
    <div className={`${lessonStyles.canvas} ${styles.quizStage}`}>
      {answer
        ? <MoleculeViewer geometry={question.geometry} showLonePairs highlight={question.centre.atom} label={`${question.example.name}, ${question.centre.shape}`} />
        : <p className={styles.hidden}>The model appears once you answer.</p>}
    </div>
  </div>;
}
