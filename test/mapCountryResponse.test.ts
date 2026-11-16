import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/utils/mapCountryResponse';

describe('mapCountryResponse', () => {
  it('maps a country API response to card data', () => {
    const raw = {
      name: 'Spain',
      flag: '🇪🇸',
      capital: 'Madrid',
      region: 'Europe',
      population: 47450795,
      languages: [
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'ca', name: 'Catalan', nativeName: 'Català' },
      ],
    };

    expect(mapCountryResponse(raw)).toEqual({
      name: 'Spain',
      flag: '🇪🇸',
      capital: 'Madrid',
      region: 'Europe',
      population: 47450795,
      languages: ['Spanish', 'Catalan'],
    });
  });
});
