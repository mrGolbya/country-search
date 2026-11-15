import { HttpError } from '../errors/HttpError';

export async function searchCountries(
  query: string,
  signal: AbortSignal
): Promise<unknown[]> {
  const response = await fetch(
    `https://countries.dev/name/${encodeURIComponent(query)}`,
    { signal }
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const countries: unknown = await response.json();
  if (!Array.isArray(countries)) {
    throw new TypeError('Expected countries response to be an array');
  }

  return countries;
}
