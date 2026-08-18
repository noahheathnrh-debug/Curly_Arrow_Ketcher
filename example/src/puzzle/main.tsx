import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { StructServiceProvider } from 'ketcher-core';

import 'ketcher-react/dist/index.css';
import '../index.css';

import { getStructServiceProvider } from '../utils';
import { ExperienceHost } from './ExperienceHost';
import type { ExtensionLaunchSurface } from './hostContract';

/**
 * Entry point for the mechanism trainer slice.
 *
 * Served alongside the ordinary example app rather than as its own project: the
 * example workspace already has a working build for these packages, and standing
 * up a second one would only be a way to get the same thing subtly wrong while
 * the embedding API is still moving.
 *
 * Open `/puzzle.html` when the example dev server is running.
 */
const Root = () => {
  const [provider, setProvider] = useState<StructServiceProvider | null>(null);

  useEffect(() => {
    getStructServiceProvider().then(setProvider);
  }, []);

  if (!provider) return <div>Loading…</div>;

  // Lets the recall surface be exercised without a host: `?surface=recall`
  // makes the activity produce a grade, which is what that surface requires.
  const surface = (new URLSearchParams(window.location.search).get('surface') ??
    'standalone') as ExtensionLaunchSurface;

  return (
    <StrictMode>
      <ExperienceHost
        structServiceProvider={provider}
        staticResourcesUrl={process.env.PUBLIC_URL ?? ''}
        surface={surface}
      />
    </StrictMode>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(<Root />);
