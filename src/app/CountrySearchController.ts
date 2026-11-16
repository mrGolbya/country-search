import { searchCountries } from '../api/searchCountries.js';
import {
  classifySearchError,
  type SearchErrorType,
} from '../utils/classifySearchError.js';
import { AsyncRequestCache } from '../utils/cache.js';
import { debounce } from '../utils/debounce.js';
import { mapCountryResponse } from '../utils/mapCountryResponse.js';

const countrySearchCache = new AsyncRequestCache(searchCountries);

type CountryCardData = ReturnType<typeof mapCountryResponse>;

export interface CountrySearchResult extends CountryCardData {
  description?: string;
  area?: number;
  borders: string[];
  currencies: string[];
}

export interface CountrySearchState {
  query: string;
  status: 'idle' | 'loading' | 'results' | 'empty' | 'error';
  countries: CountrySearchResult[];
  errorType?: Exclude<SearchErrorType, 'aborted'>;
}

type CountryResponse = Parameters<typeof mapCountryResponse>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toCountryResult(raw: unknown): CountrySearchResult {
  if (!isRecord(raw)) {
    throw new TypeError('Expected a country object');
  }

  const { name, flag, capital, region, population, languages } = raw;
  if (
    typeof name !== 'string' ||
    typeof flag !== 'string' ||
    typeof capital !== 'string' ||
    typeof region !== 'string' ||
    typeof population !== 'number' ||
    !Array.isArray(languages)
  ) {
    throw new TypeError('Country response is missing required fields');
  }

  const countryLanguages: { name: string }[] = languages.map(
    (language: unknown) => {
      if (!isRecord(language) || typeof language.name !== 'string') {
        throw new TypeError('Country response contains an invalid language');
      }
      return { name: language.name };
    },
  );
  const country: CountryResponse = {
    name,
    flag,
    capital,
    region,
    population,
    languages: countryLanguages,
  };
  const description =
    typeof raw.description === 'string' ? raw.description : undefined;
  const area = typeof raw.area === 'number' ? raw.area : undefined;
  const borders: string[] = Array.isArray(raw.borders)
    ? raw.borders.flatMap((border: unknown) =>
        typeof border === 'string' ? [border] : [],
      )
    : [];
  const currencies: string[] = Array.isArray(raw.currencies)
    ? raw.currencies.flatMap((currency: unknown) =>
        isRecord(currency) && typeof currency.name === 'string'
          ? [currency.name]
          : [],
      )
    : [];

  return {
    ...mapCountryResponse(country),
    description,
    area,
    borders,
    currencies,
  };
}

export class CountrySearchController {
  private readonly debouncedSearch: (query: string) => void;
  private activeController: AbortController | null = null;
  private lastQuery = '';
  private state: CountrySearchState = {
    query: '',
    status: 'idle',
    countries: [],
  };

  constructor(
    private readonly onStateChange: (state: CountrySearchState) => void,
    debounceDelay = 300,
    private readonly timeoutMs = 10_000,
  ) {
    this.debouncedSearch = debounce((query: string) => {
      void this.performSearch(query);
    }, debounceDelay);
  }

  getState(): CountrySearchState {
    return this.state;
  }

  setQuery(query: string): void {
    this.lastQuery = query.trim();
    this.activeController?.abort();
    this.activeController = null;

    if (!this.lastQuery) {
      this.debouncedSearch('');
      this.publish({ query: '', status: 'idle', countries: [] });
      return;
    }

    this.publish({
      query: this.lastQuery,
      status: 'loading',
      countries: [],
    });
    this.debouncedSearch(this.lastQuery);
  }

  retry(): void {
    if (!this.lastQuery) {
      return;
    }

    this.activeController?.abort();
    this.activeController = null;
    this.publish({
      query: this.lastQuery,
      status: 'loading',
      countries: [],
    });
    this.debouncedSearch(this.lastQuery);
  }

  private publish(state: CountrySearchState): void {
    this.state = state;
    this.onStateChange(state);
  }

  private async performSearch(query: string): Promise<void> {
    if (!query || query !== this.lastQuery) {
      return;
    }

    const controller = new AbortController();
    this.activeController = controller;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(this.timeoutMs),
    ]);

    try {
      const rawCountries = await countrySearchCache.get(query, signal);
      if (this.activeController !== controller) {
        return;
      }

      const countries = rawCountries.map(toCountryResult);
      this.publish({
        query,
        status: countries.length > 0 ? 'results' : 'empty',
        countries,
      });
    } catch (error) {
      if (this.activeController !== controller) {
        return;
      }

      const errorType = classifySearchError(error);
      if (errorType === 'aborted') {
        return;
      }

      this.publish({ query, status: 'error', countries: [], errorType });
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }
}
