import { useMemo, useState } from 'react';
import type { ExperienceHost } from '@mnemonexus/addon-sdk';
import type { Level } from './catalogue';
import { MechanismActivity } from './MechanismActivity';
import { offlineStructServiceProvider } from './offlineStructService';
import styles from './levels.module.css';
import { LESSONS } from './lessons';
import { typeset } from './lessons/typeset';
import { buildLesson, type LessonDef } from './lessons/kit';
import { LessonPlayer } from './lessons/LessonPlayer';

export function LevelBrowser({ host, levels }: { host: ExperienceHost; levels: Level[] }) {
  const [selected, setSelected] = useState<Level | null>(null);
  const [lesson, setLesson] = useState<LessonDef | null>(null);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('All');
  const [page, setPage] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const visible = useMemo(() => levels.filter((level) =>
    (collection === 'All' || level.collection === collection) &&
    `${level.title} ${level.puzzles.flatMap((p) => p.tags ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [levels, query, collection]);
  const lastPage = Math.max(0, Math.ceil(visible.length / 24) - 1);
  const currentPage = Math.min(page, lastPage);
  if (lesson) return <LessonPlayer key={lesson.id} lesson={buildLesson(lesson)} structServiceProvider={offlineStructServiceProvider} exitLabel="Back to levels"
    host={{ ...host.props, onExit: () => setLesson(null), onComplete: () => setLesson(null) }} />;
  if (selected) return <MechanismActivity key={selected.id} {...host.props}
    selectedPuzzles={selected.puzzles} exitLabel="Back to levels"
    onExit={() => setSelected(null)} onComplete={() => {
      setCompleted((previous) => new Set([...previous, selected.id])); setSelected(null);
    }} structServiceProvider={offlineStructServiceProvider} staticResourcesUrl="" />;
  return <main className={styles.browser}>
    <header className={styles.header}><h1>Curly Arrow Ketcher</h1><button onClick={host.exit}>Exit</button></header>
    <h2 className={styles.section}>Lessons</h2>
    <p className={styles.intro}>Watch a mechanism arrow by arrow, draw it yourself, then predict what it makes.</p>
    <ul className={styles.list}>{LESSONS.map((entry) =>
      <li key={entry.id}><button className={styles.level} onClick={() => setLesson(entry)}>
        <span>{typeset(entry.title)}</span><small>{entry.unit} · {entry.steps.length} {entry.steps.length === 1 ? 'step' : 'steps'}</small>
      </button></li>,
    )}</ul>
    <h2 className={styles.section}>Levels</h2>
    <p className={styles.intro}>Choose a level. Complete the mechanism by drawing arrows on the supplied structures.</p>
    <div className={styles.filters}>
      <input aria-label="Search levels" placeholder="Search mechanisms or level number" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
      <select aria-label="Level collection" value={collection} onChange={(event) => { setCollection(event.target.value); setPage(0); }}>
        <option>All</option><option>Guided</option><option>Enzymes</option><option>Imported</option>
      </select>
    </div>
    <p className={styles.status}>{visible.length} levels{query ? ' found' : ' available'}</p>
    <ul className={styles.list}>{visible.slice(currentPage * 24, (currentPage + 1) * 24).map((level) =>
      <li key={level.id}><button className={styles.level} onClick={() => setSelected(level)}>
        <span>{level.title}</span><small>{completed.has(level.id) ? 'Completed this visit · ' : ''}{level.collection} · {level.puzzles.length} {level.puzzles.length === 1 ? 'exercise' : 'exercises'} · {level.puzzles[0].difficulty}</small>
      </button></li>,
    )}</ul>
    {!visible.length && <p>No levels match your search.</p>}
    {lastPage > 0 && <nav aria-label="Level pages" className={styles.pages}>
      <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
      <span>{currentPage + 1} / {lastPage + 1}</span>
      <button disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next page</button>
    </nav>}
    <details className={styles.provenance}><summary>About the enzyme mechanisms</summary>
      <p>Each enzyme level is a guided mechanism on a real active site. Residues and substrates are cut down to the atoms that act, and every step says what was left out and where it comes from. Draw the arrows, in any order within a step.</p>
    </details>
    <details className={styles.provenance}><summary>About the imported levels</summary>
      <p>Recovered from the earlier Interactive Organic Reactions collection. The original importer checked arrow-induced connectivity against the next step. Levels with missing steps or ambiguous arrow conversions are held back. These levels are for independent practice; session suggestions use the six guided exercises.</p>
    </details>
  </main>;
}
