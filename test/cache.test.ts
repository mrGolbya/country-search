import { describe, expect, it, vi } from 'vitest';
import { AsyncRequestCache } from '../src/utils/cache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('AsyncRequestCache', () => {
  it('reuses successful results for the same query', async () => {
    const countries = [{ name: 'Spain' }];
    const loader = vi.fn(async () => countries);
    const cache = new AsyncRequestCache(loader);

    await expect(
      cache.get('spain', new AbortController().signal),
    ).resolves.toBe(countries);
    await expect(
      cache.get('spain', new AbortController().signal),
    ).resolves.toBe(countries);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("shares an in-flight request without coupling callers' abort signals", async () => {
    const request = deferred<string[]>();
    let requestSignal: AbortSignal | undefined;
    const loader = vi.fn((_query: string, signal: AbortSignal) => {
      requestSignal = signal;
      return request.promise;
    });
    const cache = new AsyncRequestCache(loader);
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = cache.get('spain', firstController.signal);
    const second = cache.get('spain', secondController.signal);

    await Promise.resolve();
    firstController.abort();

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(requestSignal?.aborted).toBe(false);

    request.resolve(['Spain']);
    await expect(second).resolves.toEqual(['Spain']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('aborts the shared request when its final caller aborts', async () => {
    const requestSignals: AbortSignal[] = [];
    const loader = vi.fn((_query: string, signal: AbortSignal) => {
      requestSignals.push(signal);
      return new Promise<string[]>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(signal.reason),
          { once: true },
        );
      });
    });
    const cache = new AsyncRequestCache(loader);
    const firstController = new AbortController();
    const first = cache.get('spain', firstController.signal);

    await Promise.resolve();
    const firstRejection = expect(first).rejects.toMatchObject({
      name: 'AbortError',
    });
    firstController.abort();

    const abortedSynchronously = requestSignals[0]?.aborted;
    await firstRejection;
    expect(abortedSynchronously).toBe(true);

    const secondController = new AbortController();
    const second = cache.get('spain', secondController.signal);
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(requestSignals[1]?.aborted).toBe(false);
    secondController.abort();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not cache failed requests', async () => {
    const loader = vi
      .fn<(_query: string, signal: AbortSignal) => Promise<string[]>>()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(['Spain']);
    const cache = new AsyncRequestCache(loader);

    await expect(
      cache.get('spain', new AbortController().signal),
    ).rejects.toThrow('Network unavailable');
    await expect(
      cache.get('spain', new AbortController().signal),
    ).resolves.toEqual(['Spain']);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
