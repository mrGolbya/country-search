import { afterEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/utils/debounce';

describe('debounce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the function after the specified delay', () => {
    vi.useFakeTimers();
    const fn = vi.fn<(value: number) => void>();
    const debounced = debounce(fn, 20);

    debounced(1);

    vi.advanceTimersByTime(19);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('resets the timer and uses the latest arguments', () => {
    vi.useFakeTimers();
    const fn = vi.fn<(value: number) => void>();
    const debounced = debounce(fn, 40);

    debounced(100);
    vi.advanceTimersByTime(20);
    expect(fn).not.toHaveBeenCalled();

    debounced(200);
    vi.advanceTimersByTime(39);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(200);
  });

  it('calls the function when the delay is 0', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 0);

    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('preserves the callback argument types', () => {
    vi.useFakeTimers();
    const fn = vi.fn<(greeting: string, count: number) => void>();
    const debounced = debounce(fn, 20);

    debounced('hello', 42);
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledWith('hello', 42);
  });
});
