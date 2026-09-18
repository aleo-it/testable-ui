import { describe, expect, it } from 'vitest';
import { CORPUS, EQUIVOCALS } from './corpus.js';
import {
  buildArms,
  proposeLocators,
  resolveLocators,
  ROLE_SIGNAL_PRIORITY,
} from './engine.js';

describe('lab engine', () => {
  it('keeps the signal ladder in the documented order', () => {
    expect(ROLE_SIGNAL_PRIORITY).toEqual([
      'componentName',
      'elementType',
      'fileName',
      'ariaLabelledby',
      'ariaLabel',
      'label',
      'title',
      'text',
      'inputType',
      'placeholder',
      'handlerName',
    ]);
  });

  it('puts the deterministic attribute first in the with arm', () => {
    const locators = proposeLocators(CORPUS[0].signals, 'with', CORPUS[0].testId);

    expect(locators[0]).toEqual({ kind: 'attr', testId: CORPUS[0].testId });
  });

  it('resolves the with-arm target uniquely on its first attempt', () => {
    const nodes = [...CORPUS, ...EQUIVOCALS.map((signals) => ({ instruction: 'sibling', signals }))];
    const context = buildArms(nodes);
    const locators = proposeLocators(CORPUS[0].signals, 'with', CORPUS[0].testId);

    expect(resolveLocators(context.with, locators, 0)).toMatchObject({
      firstHit: true,
      firstUnique: true,
      attempts: 1,
      wrongTargetId: null,
      ambiguousEver: false,
    });
  });

  it('records ambiguity when the without arm falls back to a shared role/name', () => {
    const nodes = [...CORPUS, ...EQUIVOCALS.map((signals) => ({ instruction: 'sibling', signals }))];
    const context = buildArms(nodes);
    const locators = proposeLocators(CORPUS[0].signals, 'without');

    expect(resolveLocators(context.without, locators, 0)).toMatchObject({
      firstHit: false,
      firstUnique: false,
      ambiguousEver: true,
    });
  });
});
