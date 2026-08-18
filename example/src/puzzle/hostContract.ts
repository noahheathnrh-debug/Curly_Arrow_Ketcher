/**
 * A stand-in for the MnemoNexus Experience contract.
 *
 * Shaped to match what a first-party Experience actually receives from that
 * host — `extensionId`, the surface it was launched from, the knowledge items
 * selected for the run, the granted permissions, and the two callbacks that end
 * it. The names and shapes are copied deliberately, so that moving this activity
 * into MnemoNexus is a matter of deleting this file and importing the real
 * contract rather than rewriting the activity around a different one.
 *
 * It is restated here, rather than imported, because the trainer lives outside
 * MnemoNexus for now and must not take a dependency on that repository to run.
 */

export type ExtensionLaunchSurface =
  | 'standalone'
  | 'recall'
  | 'transferal'
  | 'calendar';

export type ExtensionPermission =
  | 'knowledge:read'
  | 'knowledge:unlock-authored'
  | 'knowledge:propose'
  | 'ai:generate'
  | 'schedule:recall'
  | 'schedule:calendar'
  | 'network'
  | 'multiplayer';

/** Only the fields this activity actually reads. */
export interface ExtensionKnowledgeItem {
  readonly itemId: string;
  readonly conceptTitle: string;
  readonly text: string;
  readonly tags: readonly string[];
}

export interface ExperienceResult {
  readonly completed: boolean;
  /** 0–5. Required by the host when launched from the recall surface. */
  readonly quality?: number;
  readonly elapsedSeconds: number;
  /** Stage ids finished this run. */
  readonly completedStages?: readonly string[];
  /** Per-item coverage, 0–1, for partial credit across a multi-item run. */
  readonly itemCoverage?: Readonly<Record<string, number>>;
}

export interface ExperienceHostProps {
  readonly extensionId: string;
  readonly surface: ExtensionLaunchSurface;
  readonly items: readonly ExtensionKnowledgeItem[];
  readonly permissions: readonly ExtensionPermission[];
  /** Ends the run. Everything downstream — marks, scheduling — is the host's. */
  readonly onComplete: (result: ExperienceResult) => void;
  readonly onExit: () => void;
}
