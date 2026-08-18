import { useState } from 'react';
import type { StructServiceProvider } from 'ketcher-core';
import { MechanismActivity } from './MechanismActivity';
import type { ExperienceResult, ExtensionLaunchSurface } from './hostContract';
import styles from './activity.module.css';

/**
 * A stand-in for the MnemoNexus host.
 *
 * Its only jobs are the ones the real host has: launch the activity with a
 * surface and a set of items, and receive the result. It deliberately does
 * nothing with that result beyond showing it — marks, scheduling and progress
 * belong to the host, and inventing a local version of them here would be
 * exactly the duplication this whole arrangement exists to avoid.
 *
 * When this moves into MnemoNexus, this file is the one that goes away.
 */
export const ExperienceHost = ({
  structServiceProvider,
  staticResourcesUrl,
  surface = 'standalone',
}: {
  structServiceProvider: StructServiceProvider;
  staticResourcesUrl: string;
  surface?: ExtensionLaunchSurface;
}) => {
  const [result, setResult] = useState<ExperienceResult | null>(null);
  const [exited, setExited] = useState(false);

  if (result || exited) {
    return (
      <div className={styles.panel} style={{ height: '100vh' }}>
        <h1 className={styles.title}>
          {result?.completed ? 'Activity complete' : 'Activity ended'}
        </h1>
        {result && (
          <>
            <p className={styles.prompt}>
              {result.completedStages?.length ?? 0} mechanism
              {result.completedStages?.length === 1 ? '' : 's'} finished in{' '}
              {result.elapsedSeconds}s.
            </p>
            <pre className={styles.hint}>{JSON.stringify(result, null, 2)}</pre>
            <p className={styles.note}>
              This is what the activity hands back. A real host would turn it
              into progress and scheduling; this one only shows it.
            </p>
          </>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              setResult(null);
              setExited(false);
            }}
          >
            Run it again
          </button>
        </div>
      </div>
    );
  }

  return (
    <MechanismActivity
      extensionId="curly-arrow.mechanism-trainer"
      surface={surface}
      items={[]}
      permissions={['knowledge:read']}
      structServiceProvider={structServiceProvider}
      staticResourcesUrl={staticResourcesUrl}
      onComplete={setResult}
      onExit={() => setExited(true)}
    />
  );
};
