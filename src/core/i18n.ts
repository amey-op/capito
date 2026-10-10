/**
 * i18next setup. English is the source; Hindi and Telugu live in src/content/i18n/hi and /te
 * with the same flat keys, and any key not translated yet falls back to English.
 * Keys are flat (`lesson.1_1.gut.prompt`), so the key separator is disabled.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { merged } from '@/content/i18n';

export const supportedLanguages = ['en', 'hi', 'te'] as const;
export type Language = (typeof supportedLanguages)[number];

/** localStorage key for the learner's language choice. */
export const LANGUAGE_KEY = 'capito-lang';

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (supportedLanguages as readonly string[]).includes(value);

/** The saved choice, or English when nothing (or nothing valid) is saved. */
export function savedLanguage(): Language {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

const setDocumentLang = (lang: Language) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
};

const resources = Object.fromEntries(
  Object.entries(merged.resources).map(([lang, messages]) => [lang, { translation: messages }]),
);

const startLanguage = savedLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: startLanguage,
  fallbackLng: 'en',
  supportedLngs: [...supportedLanguages],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  showSupportNotice: false,
});
setDocumentLang(startLanguage);

/** Switch language, remember the choice and update `<html lang>` so the Indic font rules apply. */
export async function setLanguage(lang: Language): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // Storage blocked (private mode): the switch still works for this visit.
  }
  setDocumentLang(lang);
}

export default i18n;
