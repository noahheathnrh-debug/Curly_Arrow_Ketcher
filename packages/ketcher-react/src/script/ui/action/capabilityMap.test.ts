import {
  ACTION_CAPABILITY,
  TOOL_CAPABILITY,
  capabilityForAction,
} from './capabilityMap';
import {
  CAPABILITY_PROFILES,
  capabilityProvider,
  resolveCapabilities,
} from 'ketcher-core';
import { isToolAllowed } from '../../editor/capabilities';

/**
 * A capability is a permission, not a piece of styling. These tests pin the
 * thing that makes it one: the same restriction has to hold whichever way the
 * user reaches the operation.
 */

const KETCHER_ID = 'capability-map-test';

afterEach(() => capabilityProvider.remove(KETCHER_ID));

describe('capability lookup', () => {
  it('judges a toolbar action by the tool it activates', () => {
    // Keyed on the tool rather than the button, so a second toolbar entry for
    // the same tool is gated without anyone remembering to list it.
    expect(capabilityForAction('curly-arrow', { tool: 'curlyarrow' })).toBe(
      'drawMechanismArrows',
    );
    expect(capabilityForAction('some-other-name', { tool: 'bond' })).toBe(
      'editBonds',
    );
  });

  it('falls back to the action name for document operations', () => {
    // `open` and `save` activate no tool, so they can only be keyed by name.
    expect(capabilityForAction('open', undefined)).toBe('importFiles');
    expect(capabilityForAction('save', undefined)).toBe('exportFiles');
  });

  it('leaves unclassified actions unrestricted', () => {
    // The tables name what is restricted. Anything unlisted stays available
    // rather than silently disappearing when a profile is applied.
    expect(capabilityForAction('about', undefined)).toBeUndefined();
  });

  it('never restricts selecting or panning by tool', () => {
    // A locked structure the learner cannot select or pan is unreadable.
    expect(TOOL_CAPABILITY.select).toBeUndefined();
    expect(TOOL_CAPABILITY.hand).toBeUndefined();
  });
});

describe('puzzle-arrow-only locks chemistry but not reading', () => {
  beforeEach(() => capabilityProvider.set(KETCHER_ID, 'puzzle-arrow-only'));

  it.each([
    ['bond', false],
    ['chain', false],
    ['atom', false],
    ['charge', false],
    ['eraser', false],
    ['curlyarrow', true],
    ['lonepair', true],
    ['select', true],
    ['hand', true],
  ])('tool %s allowed=%s', (tool, allowed) => {
    expect(isToolAllowed(KETCHER_ID, tool)).toBe(allowed);
  });

  it('refuses a tool asked for programmatically, not just from the toolbar', () => {
    // The toolbar and the shortcut both consult the action table first; a host
    // calling the API does not, so this is the path a hidden button misses.
    expect(isToolAllowed(KETCHER_ID, 'bond')).toBe(false);
  });

  it('stops the eraser, so a locked structure cannot be taken apart atom by atom', () => {
    expect(isToolAllowed(KETCHER_ID, 'eraser')).toBe(false);
  });
});

describe('profiles', () => {
  it('defaults to unrestricted, so an embedder that says nothing is unaffected', () => {
    const capabilities = resolveCapabilities(undefined);
    expect(Object.values(capabilities).every(Boolean)).toBe(true);
  });

  it('reads a bare override as a change to full, not a whitelist', () => {
    // `{editAtoms: false}` means "everything but editing atoms". Reading it as
    // a whitelist would withhold the other eight capabilities by accident.
    const capabilities = resolveCapabilities({ editAtoms: false });
    expect(capabilities.editAtoms).toBe(false);
    expect(capabilities.editBonds).toBe(true);
    expect(capabilities.panAndZoom).toBe(true);
  });

  it('applies overrides on top of a named profile', () => {
    const capabilities = resolveCapabilities({
      profile: 'puzzle-arrow-only',
      overrides: { exportFiles: true },
    });
    expect(capabilities.editBonds).toBe(false);
    expect(capabilities.exportFiles).toBe(true);
  });

  it('keeps review read-only', () => {
    const review = CAPABILITY_PROFILES.review;
    expect(review.editAtoms).toBe(false);
    expect(review.editBonds).toBe(false);
    expect(review.moveStructures).toBe(false);
    expect(review.drawMechanismArrows).toBe(false);
    expect(review.panAndZoom).toBe(true);
  });

  it('leaves mechanism fully capable — it narrows the toolbar, it does not lock', () => {
    expect(Object.values(CAPABILITY_PROFILES.mechanism).every(Boolean)).toBe(
      true,
    );
  });
});

describe('capability tables are internally consistent', () => {
  const known = new Set(Object.keys(CAPABILITY_PROFILES.full));

  it('only names capabilities that exist', () => {
    // Guards against a typo silently disabling the gate: an unknown capability
    // name would make the lookup undefined, i.e. permanently allowed.
    Object.values(TOOL_CAPABILITY).forEach((capability) =>
      expect(known.has(capability)).toBe(true),
    );
    Object.values(ACTION_CAPABILITY).forEach((capability) =>
      expect(known.has(capability)).toBe(true),
    );
  });
});
