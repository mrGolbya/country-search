import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { classifySearchError } from '../src/utils/classifySearchError';

describe('classifySearchError', () => {
  it('classifies a user cancellation separately', () => {
    expect(classifySearchError(new DOMException('Aborted', 'AbortError'))).toBe(
      'aborted'
    );
  });

  it('classifies a timeout separately from a user cancellation', () => {
    expect(
      classifySearchError(new DOMException('Timed out', 'TimeoutError'))
    ).toBe('timeout');
  });

  it('classifies HTTP errors', () => {
    expect(classifySearchError(new HttpError(503))).toBe('http');
  });

  it('classifies other failures as network errors', () => {
    expect(classifySearchError(new TypeError('Network unavailable'))).toBe(
      'network'
    );
  });
});
