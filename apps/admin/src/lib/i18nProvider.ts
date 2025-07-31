import defaultMessages from 'ra-language-english';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import type { I18nProvider } from 'ra-core';

export const i18nProvider: I18nProvider = polyglotI18nProvider(
  () => defaultMessages,
  'en',
  [{ name: 'en', value: 'English' }],
  { allowMissing: true },
);
