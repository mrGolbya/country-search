import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { searchCountries } from '../src/api/searchCountries';

describe('searchCountries', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns countries matching the query and forwards the abort signal', async () => {
    const countries = [{ name: 'Spain' }];
    const signal = new AbortController().signal;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(countries), { status: 200 })
    );

    await expect(searchCountries('spain', signal)).resolves.toEqual(countries);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://countries.dev/name/spain',
      { signal }
    );
  });

  it('returns an empty array when the API responds with 404', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      searchCountries('no-match', new AbortController().signal)
    ).resolves.toEqual([]);
  });

  it('throws HttpError with the response status for other HTTP errors', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const result = searchCountries('spain', new AbortController().signal);

    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toHaveProperty('status', 503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates network errors', async () => {
    const networkError = new TypeError('Network unavailable');
    fetchMock.mockRejectedValue(networkError);

    await expect(
      searchCountries('spain', new AbortController().signal)
    ).rejects.toBe(networkError);
  });
});
