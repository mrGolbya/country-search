import {
  CountrySearchController,
  type CountrySearchResult,
  type CountrySearchState,
} from './app/CountrySearchController.js';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

function initializeApp(): void {
  const app = createElement('main', 'app-shell');
  const header = createElement('header', 'hero');
  const eyebrow = createElement('p', 'eyebrow');
  eyebrow.textContent = 'COUNTRY ATLAS';

  const title = createElement('h1');
  const titleAccent = createElement('span', 'title-accent');
  titleAccent.textContent = 'destination';
  title.append('Find your next ', titleAccent);

  const intro = createElement('p', 'hero-copy');
  intro.textContent =
    'Explore countries around the world. Start typing a country name to discover it.';
  header.append(eyebrow, title, intro);

  const searchPanel = createElement('section', 'search-panel');
  const label = createElement('label', 'search-label');
  label.htmlFor = 'country-search';
  label.textContent = 'Search countries';

  const inputRow = createElement('div', 'input-row');
  const searchIcon = createElement('span', 'search-icon');
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.textContent = '⌕';

  const input = createElement('input', 'search-input');
  input.id = 'country-search';
  input.type = 'search';
  input.name = 'country';
  input.placeholder = 'Try Spain, Japan, or Brazil';
  input.autocomplete = 'off';
  input.setAttribute('aria-describedby', 'search-hint search-status');

  const clearButton = createElement('button', 'clear-button');
  clearButton.type = 'button';
  clearButton.textContent = 'Clear';
  clearButton.hidden = true;
  clearButton.setAttribute('aria-label', 'Clear search');

  inputRow.append(searchIcon, input, clearButton);
  const hint = createElement('p', 'search-hint');
  hint.id = 'search-hint';
  hint.textContent = 'Results update as you type.';

  const status = createElement('p', 'search-status');
  status.id = 'search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const retryButton = createElement('button', 'retry-button');
  retryButton.type = 'button';
  retryButton.textContent = 'Try again';
  retryButton.hidden = true;

  searchPanel.append(label, inputRow, hint, status, retryButton);

  const resultsSection = createElement('section', 'results-section');
  resultsSection.setAttribute('aria-label', 'Country search results');
  const resultsGrid = createElement('div', 'results-grid');
  resultsSection.append(resultsGrid);

  const footer = createElement('footer', 'app-footer');
  footer.textContent = 'A little closer to everywhere.';

  const detailsDialog = createElement('dialog', 'details-dialog');
  const detailsContent = createElement('div', 'details-content');
  const closeButton = createElement('button', 'dialog-close');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => detailsDialog.close());
  detailsDialog.append(detailsContent, closeButton);
  detailsDialog.addEventListener('click', (event) => {
    if (event.target === detailsDialog) {
      detailsDialog.close();
    }
  });

  app.append(header, searchPanel, resultsSection, footer);
  document.body.append(app, detailsDialog);

  function formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
  }

  function createDetail(labelText: string, value: string): HTMLDivElement {
    const item = createElement('div', 'detail-item');
    const labelElement = createElement('dt');
    labelElement.textContent = labelText;
    const valueElement = createElement('dd');
    valueElement.textContent = value || 'Not available';
    item.append(labelElement, valueElement);
    return item;
  }

  function openCountryDetails(country: CountrySearchResult): void {
    detailsContent.replaceChildren();

    const heading = createElement('div', 'dialog-heading');
    const flag = createElement('span', 'dialog-flag');
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = country.flag;
    const name = createElement('h2');
    name.textContent = country.name;
    heading.append(flag, name);

    const description = createElement('p', 'dialog-description');
    description.textContent =
      country.description ?? `Discover ${country.name}, in ${country.region}.`;

    const details = createElement('dl', 'details-list');
    details.append(
      createDetail('Capital', country.capital),
      createDetail('Region', country.region),
      createDetail('Population', formatNumber(country.population)),
      createDetail(
        'Area',
        country.area === undefined ? '' : `${formatNumber(country.area)} km²`,
      ),
      createDetail('Borders', country.borders.join(', ')),
      createDetail('Languages', country.languages.join(', ')),
      createDetail('Currency', country.currencies.join(', ')),
    );
    detailsContent.append(heading, description, details);
    detailsDialog.showModal();
  }

  function createCountryCard(country: CountrySearchResult): HTMLButtonElement {
    const card = createElement('button', 'country-card');
    card.type = 'button';
    card.setAttribute('aria-label', `View details for ${country.name}`);

    const flag = createElement('span', 'country-flag');
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = country.flag;

    const copy = createElement('span', 'country-copy');
    const name = createElement('span', 'country-name');
    name.textContent = country.name;
    const capital = createElement('span', 'country-capital');
    capital.textContent = `Capital · ${country.capital}`;
    copy.append(name, capital);

    const meta = createElement('span', 'country-meta');
    const region = createElement('span');
    region.textContent = country.region;
    const population = createElement('span');
    population.textContent = formatNumber(country.population);
    meta.append(region, population);

    card.append(flag, copy, meta);
    card.addEventListener('click', () => openCountryDetails(country));
    return card;
  }

  function renderState(state: CountrySearchState): void {
    clearButton.hidden = state.query.length === 0;
    resultsGrid.replaceChildren(
      ...state.countries.map((country) => createCountryCard(country)),
    );

    retryButton.hidden = state.status !== 'error';
    status.className = `search-status status-${state.status}`;

    switch (state.status) {
      case 'idle':
        status.textContent = 'Enter a country name to get started.';
        break;
      case 'loading':
        status.textContent = `Searching for “${state.query}”…`;
        break;
      case 'results':
        status.textContent = `${state.countries.length} ${
          state.countries.length === 1 ? 'country' : 'countries'
        } found`;
        break;
      case 'empty':
        status.textContent = `No countries found for “${state.query}”. Try another name.`;
        break;
      case 'error':
        status.textContent =
          state.errorType === 'timeout'
            ? 'The search took too long. Please try again.'
            : state.errorType === 'http'
              ? 'The country service returned an error. Please try again.'
              : 'Could not connect. Check your connection and try again.';
        break;
    }
  }

  const controller = new CountrySearchController(renderState);
  input.addEventListener('input', () => controller.setQuery(input.value));
  clearButton.addEventListener('click', () => {
    input.value = '';
    controller.setQuery('');
    input.focus();
  });
  retryButton.addEventListener('click', () => controller.retry());
  renderState(controller.getState());
}

if (typeof document !== 'undefined') {
  initializeApp();
}
