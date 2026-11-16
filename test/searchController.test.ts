import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountrySearchController } from '../src/app/CountrySearchController';

describe('CountrySearchController', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts an in-flight search and keeps the latest results', async () => {
    vi.useFakeTimers();
    const states: ReturnType<CountrySearchController['getState']>[] = [];
    const controller = new CountrySearchController(
      (state) => states.push(state),
      300,
      10_000,
    );
    let resolveSp: ((response: Response) => void) | undefined;
    let resolveSpain: ((response: Response) => void) | undefined;
    let signalSp: AbortSignal | undefined;
    let signalSpain: AbortSignal | undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const signal = init?.signal;

        return new Promise<Response>((resolve, reject) => {
          if (url.endsWith('/sp')) {
            resolveSp = resolve;
            signalSp = signal ?? undefined;
          } else {
            resolveSpain = resolve;
            signalSpain = signal ?? undefined;
          }

          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });
      }),
    );

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    expect(resolveSp).toBeDefined();
    expect(signalSp?.aborted).toBe(false);

    controller.setQuery('spain');
    expect(signalSp?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(resolveSpain).toBeDefined();
    expect(signalSpain?.aborted).toBe(false);

    resolveSpain?.(
      new Response(
        JSON.stringify([
          {
            name: 'Spain',
            flag: '🇪🇸',
            capital: 'Madrid',
            region: 'Europe',
            population: 47450795,
            languages: [{ name: 'Spanish' }],
          },
        ]),
        { status: 200 },
      ),
    );
    await vi.waitFor(() => {
      expect(states.at(-1)?.status).toBe('results');
    });

    resolveSp?.(
      new Response(
        JSON.stringify([
          {
            name: 'São Tomé and Príncipe',
            flag: '🇸🇹',
            capital: 'São Tomé',
            region: 'Africa',
            population: 223107,
            languages: [{ name: 'Portuguese' }],
          },
        ]),
        { status: 200 },
      ),
    );

    expect(signalSp?.aborted).toBe(true);
    expect(states.at(-1)?.query).toBe('spain');
    expect(states.at(-1)?.countries[0]?.name).toBe('Spain');
    expect(states.every((state) => state.status !== 'error')).toBe(true);
  });

  it('shows an empty state for a 404 response', async () => {
    vi.useFakeTimers();
    const states: ReturnType<CountrySearchController['getState']>[] = [];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new CountrySearchController((state) =>
      states.push(state),
    );

    controller.setQuery('no-match');
    await vi.advanceTimersByTimeAsync(300);
    await vi.waitFor(() => {
      expect(states.at(-1)?.status).toBe('empty');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send a request if the input is cleared before debounce expires', async () => {
    vi.useFakeTimers();
    const states: ReturnType<CountrySearchController['getState']>[] = [];
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new CountrySearchController((state) =>
      states.push(state),
    );

    controller.setQuery('Canada');
    await vi.advanceTimersByTimeAsync(100);
    controller.setQuery('');
    await vi.advanceTimersByTimeAsync(500);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(states.at(-1)?.status).toBe('idle');
  });
});
