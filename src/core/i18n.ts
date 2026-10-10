/**
 * i18next setup. Phase 1 = English only; Hindi/Telugu files are added in Phase 2 (R5) under
 * src/content/i18n/hi and /te, with the English term shown beside each translation.
 * Keys are flat (`lesson.1_1.gut.prompt`), so the key separator is disabled.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { merged } from '@/content/i18n';

export const supportedLanguages = ['en'] as const;
export type Language = (typeof supportedLanguages)[number];

const resources = Object.fromEntries(
  Object.entries(merged.resources).map(([lang, messages]) => [lang, { translation: messages }]),
);

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  showSupportNotice: false,
});

export default i18n;
