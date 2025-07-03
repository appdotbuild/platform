import { resolve, dirname } from 'path';
import { expect, test } from 'vitest';
import { fileURLToPath } from 'url';
import { render, fireEvent } from 'cli-testing-library';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('Is able to make terminal input and view in-progress stdout', async () => {
  // Run the built CLI distribution
  const { findByText } = await render('bun', ['tmp/dist/entrypoint.js'], {
    cwd: resolve(__dirname, '..', '..'),
  });

  const instance = await findByText('Create new app');
  expect(instance).toBeInTheConsole();

  const instance2 = await fireEvent(instance, { key: 'ArrowDown' });

  expect(await findByText('❯ Two')).toBeInTheConsole();
});
