import type { EnzymeActivity } from './enzymes/engine';

/**
 * The public stand-in for `@private-content`. The owner's lecture-derived enzyme mechanisms and the recovered level
 * corpus live in `mnemonexus/private/`, which is never committed. Builds and tests resolve `@private-content` to
 * `private/index.ts` when it exists and to this file otherwise, so a public clone builds with no private content.
 */
export const ENZYME_ACTIVITIES: EnzymeActivity[] = [];
export const HAS_PRIVATE_CONTENT = false;
