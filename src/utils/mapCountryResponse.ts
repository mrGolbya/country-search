interface CountryLanguage {
  name: string;
}

interface CountryResponse {
  name: string;
  flag: string;
  capital: string;
  region: string;
  population: number;
  languages: CountryLanguage[];
}

export function mapCountryResponse(raw: CountryResponse) {
  return {
    name: raw.name,
    flag: raw.flag,
    capital: raw.capital,
    region: raw.region,
    population: raw.population,
    languages: raw.languages.map(({ name }) => name),
  };
}
