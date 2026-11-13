import { useCallback, useMemo, useRef, useState } from 'react';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { LESSONS } from '../lessons';
import { follow, leaves, pathTo, type KeyLeaf, type KeyQuestion } from './mechanismKey';
import { SCENARIOS, type Scenario } from './scenarios';
import lessonStyles from '../lessons/lessons.module.css';
import styles from './key.module.css';

/**
 * Which one? (Reactions & mechanisms): walk the key to any mechanism, then a quiz of reactions told in words, each
 * answered by walking the key. A wrong walk shows the first question where it went the other way, and why.
 */
export const QUIZ_LENGTH = 5;
type Stage = 'key' | 'quiz';

const LESSON_TITLE = new Map(LESSONS.map((lesson) => [lesson.id, lesson.title]));
const ALL_LEAVES = leaves();

/** Quiz questions: reactions for different mechanisms, in random order. */
export function quizScenarios(count: number, random: () => number): Scenario[] {
  const pool = [...SCENARIOS];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const out: Scenario[] = [];
  for (const scenario of pool) {
    if (out.length === count) break;
    if (!out.some((picked) => picked.leaf === scenario.leaf)) out.push(scenario);
  }
  return out;
}

interface Props { host: ExperienceHostProps; practice?: PracticeLaunch; exitLabel?: string }

export function KeyActivity({ host, practice, exitLabel }: Props) {
  const [stage, setStage] = useState<Stage>('key');
  const startedAt = useRef(Date.now());
  const best = useRef({ right: 0, first: false, rounds: 0 });
  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const tag = skill ? { skill } : {};
    const criteria: PracticeCriterion[] = [
      { id: 'key.quiz', label: `Quiz: at least ${QUIZ_LENGTH - 1} of ${QUIZ_LENGTH} mechanisms right`, met: best.current.right >= QUIZ_LENGTH - 1, weight: 3, ...tag },
      { id: 'key.quiz-all', label: `Quiz: all ${QUIZ_LENGTH} right in the first round`, met: best.current.first, weight: 1, ...tag },
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
        <span className={lessonStyles.unit}>Reactions & mechanisms</span>
        <h1>Which mechanism?</h1>
      </div>
      <nav className={lessonStyles.stages} aria-label="Stages">
        {(['key', 'quiz'] as const).map((s, i) => <button key={s} type="button" aria-current={stage === s ? 'step' : undefined}
          className={lessonStyles.stage} onClick={() => setStage(s)}>
          <span className={lessonStyles.stageNumber}>{i + 1}</span>{s === 'key' ? 'The key' : 'Quiz'}
        </button>)}
      </nav>
      {stage === 'key' && <button type="button" className={lessonStyles.primary} onClick={() => setStage('quiz')}>Start the quiz</button>}
      <button type="button" className={lessonStyles.quiet} onClick={() => complete(false)}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={lessonStyles.body}>
      {stage === 'key' ? <Explore /> : <Quiz onRound={(right) => {
        const first = best.current.rounds === 0;
        best.current = { right: Math.max(best.current.right, right), first: best.current.first || (first && right === QUIZ_LENGTH), rounds: best.current.rounds + 1 };
      }} onFinish={() => complete(true)} />}
    </div>
  </div>;
}

/** The questions answered so far, as a trail; choosing one goes back to it. */
function Trail({ answers, onBack }: { answers: readonly boolean[]; onBack: (length: number) => void }) {
  if (!answers.length) return null;
  return <ol className={styles.trail} aria-label="Your answers">
    {answers.map((answer, i) => {
      const question = follow(answers.slice(0, i)) as KeyQuestion;
      return <li key={i}><button type="button" className={styles.trailStep} onClick={() => onBack(i)} title="Go back to this question">
        <span className={styles.trailLabel}>{question.label}</span> {answer ? question.yes : question.no}
      </button></li>;
    })}
  </ol>;
}

function Ask({ question, onAnswer }: { question: KeyQuestion; onAnswer: (answer: boolean) => void }) {
  return <div className={styles.ask}>
    <h2>{question.label}</h2>
    <div className={styles.answers} role="group" aria-label={question.label}>
      <button type="button" className={styles.answer} onClick={() => onAnswer(true)}>It {question.yes}</button>
      <button type="button" className={styles.answer} onClick={() => onAnswer(false)}>It {question.no}</button>
    </div>
  </div>;
}

function LeafCard({ leaf }: { leaf: KeyLeaf }) {
  return <div className={styles.leaf}>
    <h2>{leaf.name}</h2>
    <p>{leaf.about}</p>
    {leaf.lessons.length > 0 && <p className={lessonStyles.muted}>Taught in Learn: {leaf.lessons.map((id) => LESSON_TITLE.get(id) ?? id).join(' · ')}</p>}
  </div>;
}

function Explore() {
  const [answers, setAnswers] = useState<boolean[]>([]);
  const at = follow(answers);
  const reached = at.kind === 'leaf' ? at.id : undefined;
  return <div className={lessonStyles.split}>
    <section className={lessonStyles.panel} aria-live="polite">
      <p className={lessonStyles.hint}>Answer each question about a reaction to find its mechanism, or choose a mechanism to see the way to it. The key covers the {ALL_LEAVES.length} mechanisms taught in Learn; others, such as hydrogenation or epoxidation, are not in it yet.</p>
      <Trail answers={answers} onBack={(n) => setAnswers(answers.slice(0, n))} />
      {at.kind === 'ask' ? <Ask question={at} onAnswer={(answer) => setAnswers([...answers, answer])} /> : <LeafCard leaf={at} />}
      {answers.length > 0 && <div className={lessonStyles.actions}>
        <button type="button" className={lessonStyles.quiet} onClick={() => setAnswers([])}>Start again</button>
      </div>}
    </section>
    <div className={`${lessonStyles.canvas} ${styles.listStage}`}>
      <h2 className={styles.listHead}>{ALL_LEAVES.length} mechanisms</h2>
      <ul className={styles.list}>
        {ALL_LEAVES.map((leaf) => <li key={leaf.id}>
          <button type="button" className={styles.pick} aria-pressed={reached === leaf.id}
            onClick={() => setAnswers(pathTo(leaf.id)!.map((step) => step.answer))}>{leaf.name}</button>
        </li>)}
      </ul>
    </div>
  </div>;
}

function Quiz({ onRound, onFinish }: { onRound: (right: number) => void; onFinish: () => void }) {
  const [round, setRound] = useState(0);
  const scenarios = useMemo(() => quizScenarios(QUIZ_LENGTH, Math.random), [round]);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const scenario = scenarios[at];
  const reached = follow(answers);
  const done = reached.kind === 'leaf';
  const right = done && reached.id === scenario.leaf;
  const finished = results.length === scenarios.length;
  const correctPath = pathTo(scenario.leaf)!;
  const wrongTurn = done && !right ? correctPath.findIndex((step, i) => answers[i] !== step.answer) : -1;
  const answer = (value: boolean) => {
    const next = [...answers, value];
    setAnswers(next);
    const end = follow(next);
    if (end.kind === 'leaf') {
      const all = [...results, end.id === scenario.leaf];
      setResults(all);
      if (all.length === scenarios.length) onRound(all.filter(Boolean).length);
    }
  };
  const again = () => { setRound((r) => r + 1); setAt(0); setAnswers([]); setResults([]); };
  const correct = ALL_LEAVES.find((leaf) => leaf.id === scenario.leaf)!;

  return <div className={lessonStyles.split}>
    <section className={lessonStyles.panel} aria-live="polite">
      <span className={lessonStyles.counter}>Reaction {at + 1} of {scenarios.length}</span>
      <p className={styles.scenario}>{scenario.text}</p>
      <Trail answers={answers} onBack={done ? () => undefined : (n) => setAnswers(answers.slice(0, n))} />
      {reached.kind === 'ask' && <Ask question={reached} onAnswer={answer} />}
      {done && <p className={`${lessonStyles.message} ${right ? lessonStyles.right : lessonStyles.wrong}`}>
        {right ? `Right: ${correct.name}.` : `You reached ${reached.name}; it is ${correct.name}.`}
        {wrongTurn >= 0 && <> At “{correctPath[wrongTurn].question.label}”, this reaction {correctPath[wrongTurn].answer ? correctPath[wrongTurn].question.yes : correctPath[wrongTurn].question.no}.</>}
      </p>}
      {done && <p className={lessonStyles.muted}>{correct.about}</p>}
      {finished && at === scenarios.length - 1 && <p className={lessonStyles.says}>{results.filter(Boolean).length} of {scenarios.length} right.</p>}
      <div className={lessonStyles.actions}>
        {done && at < scenarios.length - 1 && <button type="button" className={lessonStyles.primary} onClick={() => { setAt(at + 1); setAnswers([]); }}>Next</button>}
        {finished && at === scenarios.length - 1 && <>
          <button type="button" className={lessonStyles.primary} onClick={onFinish}>Finish</button>
          <button type="button" className={lessonStyles.quiet} onClick={again}>New reactions</button>
        </>}
      </div>
    </section>
    <div className={`${lessonStyles.canvas} ${styles.listStage}`}>
      <h2 className={styles.listHead}>The way to {done ? correct.name : 'the answer'}</h2>
      {done
        ? <ol className={styles.path}>{correctPath.map((step, i) => <li key={step.question.id} data-state={i === wrongTurn ? 'wrong' : undefined}>
            <span className={styles.trailLabel}>{step.question.label}</span> {step.answer ? step.question.yes : step.question.no}
          </li>)}</ol>
        : <p className={styles.hidden}>The way through the key appears once you reach a mechanism.</p>}
    </div>
  </div>;
}
