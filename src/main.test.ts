import { expect, it } from 'vitest';

it('loads the application entry point', async () => {
  await expect(import('./main.js')).resolves.toBeDefined();
});
