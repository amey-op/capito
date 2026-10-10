/**
 * Loads every flat i18n JSON in src/content/i18n/<lang>/*.json and merges them per language.
 * One file per level and area (ui, level1, events, tools, glossary-level1 …) so lanes never edit
 * the same file. A key defined in two files is an error (reported, and caught by content.test.ts).
 */

export type FlatMessages = Record<string, string>;
export type LocaleFiles = Record<string, FlatMessages>;

export interface MergeResult {
  /** lang → merged flat messages */
  resources: Record<string, FlatMessages>;
  /** Keys defined in more than one file of the same language. */
  duplicates: Array<{ lang: string; key: string; files: string[] }>;
  /** Non-string values (all values must be plain strings). */
  invalid: Array<{ file: string; key: string }>;
}

/** Path like `./i18n/en/level1.json` → `en`. */
export const langOf = (path: string): string => path.split('/').slice(-2, -1)[0] ?? 'unknown';

export function mergeLocaleFiles(files: LocaleFiles): MergeResult {
  const resources: Record<string, FlatMessages> = {};
  const seen = new Map<string, string[]>();
  const invalid: MergeResult['invalid'] = [];
  for (const [path, messages] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const lang = langOf(path);
    const target = (resources[lang] ??= {});
    for (const [key, value] of Object.entries(messages)) {
      if (typeof value !== 'string') {
        invalid.push({ file: path, key });
        continue;
      }
      const id = `${lang}\u0000${key}`;
      seen.set(id, [...(seen.get(id) ?? []), path]);
      target[key] = value;
    }
  }
  const duplicates = [...seen.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([id, files]) => {
      const [lang, key] = id.split('\u0000') as [string, string];
      return { lang, key, files };
    });
  return { resources, duplicates, invalid };
}

/** All locale files bundled at build time (works offline). */
export const localeFiles: LocaleFiles = Object.fromEntries(
  Object.entries(import.meta.glob<FlatMessages>('./i18n/*/*.json', { eager: true, import: 'default' })),
);

export const merged = mergeLocaleFiles(localeFiles);

if (import.meta.env.DEV && merged.duplicates.length > 0) {
  console.error('[i18n] duplicate keys across files:', merged.duplicates);
}
