import { describe, expect, it } from 'vitest';
import { parseAgentResponse } from './agent-protocol.js';

describe('agent protocol', () => {
  it('accepts an object response', () => {
    expect(parseAgentResponse('{"locators":[{"kind":"text","name":"Save"}]}')).toEqual({
      locators: [{ kind: 'text', name: 'Save' }],
    });
  });

  it('accepts a locator array response', () => {
    expect(parseAgentResponse('[{"kind":"attr","testId":"save-button"}]').locators).toHaveLength(1);
  });

  it('rejects responses without locators', () => {
    expect(() => parseAgentResponse('{"answer":"Save"}')).toThrow(/locators array/);
  });
});
