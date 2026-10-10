/**
 * Tool contract (calculators, bespoke tools, static cards). Aryan's lane implements them in
 * src/features/tools; the lesson player and portfolio only use `ToolEmbed` and `/tool/:id`.
 * CONTRACT FILE: change only through a `contract-change` PR.
 */

/** Config calculators rendered by one generic <ConfigCalculator/> (R1). */
export const configToolIds = [
  'leakFinder',
  'goalPlanner',
  'depreciation',
  'emi',
  'inflation',
  'timeMachine',
  'fd',
  'rd',
  'sip',
  'lumpsum',
  'goalSip',
  'feeLens',
  'goldCompare',
  'slab',
  'takeHome',
] as const;

/** Bespoke builds (R2, R3). */
export const bespokeToolIds = ['budgetBuilder', 'upiPractice', 'badYear', 'scamShield', 'checkIt', 'nowWhat'] as const;

/** Static illustrated cards (or simple bars) when short on time. */
export const staticToolIds = [
  'passbookReader',
  'monthsCovered',
  'shockAbsorber',
  'minimumDueTrap',
  'scoreSimulator',
  'priceMoodSwings',
  'optionsOverTime',
] as const;

export type ConfigToolId = (typeof configToolIds)[number];
export type BespokeToolId = (typeof bespokeToolIds)[number];
export type StaticToolId = (typeof staticToolIds)[number];
export type ToolId = ConfigToolId | BespokeToolId | StaticToolId;

export const allToolIds: readonly ToolId[] = [...configToolIds, ...bespokeToolIds, ...staticToolIds];
export const isToolId = (id: string): id is ToolId => (allToolIds as readonly string[]).includes(id);

/** Query-param / prefill names shared by the portfolio "Predict" links and lesson cards. */
export const prefillParams = [
  'principal',
  'ratePct',
  'months',
  'monthly',
  'years',
  'amount',
  'target',
  'instalment',
  'cost',
  'income',
] as const;
export type PrefillParam = (typeof prefillParams)[number];
export type ToolPrefill = Partial<Record<string, number>>;

export type ToolUnit = 'inr' | 'pct' | 'years' | 'months' | 'days' | 'count';
export type ToolTone = 'good' | 'mixed' | 'bad' | 'neutral';

export interface ToolInput {
  id: string;
  labelKey: string;
  unit: ToolUnit;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ToolResult {
  id: string;
  labelKey: string;
  value: number;
  unit: ToolUnit;
  tone?: ToolTone;
}

export interface ToolOutput {
  results: ToolResult[];
  /** Chart rows: `x` plus one numeric column per series. */
  series?: Array<{ x: number } & Record<string, number>>;
  /** Placeholder values for i18n `tools.<id>.shocker`. */
  shocker?: Record<string, string | number>;
  /** i18n keys of warnings to show. */
  warnings?: string[];
}

export interface ToolDef {
  id: ConfigToolId;
  titleKey: string;
  inputs: ToolInput[];
  /** Must call src/core/finance.ts; never re-implement formulas. Inputs arrive clamped. */
  compute(values: Record<string, number>): ToolOutput;
  /** Projects returns → show "assumption, not a promise" footer. */
  hasReturns: boolean;
  /** Uses a `verified:false` fact (e.g. tax slabs) → show "approximate, check official site". */
  approximate?: boolean;
}

/** Props of the embeddable tool used by the lesson player (A1) and the tool page. */
export interface ToolEmbedProps {
  toolId: ToolId;
  prefill?: ToolPrefill;
  onClose?: () => void;
}

/** Scam Shield finish callback payload; the app dispatches `SHIELD_RESULT` with it. */
export interface ShieldResult {
  seen: number;
  correct: number;
}

/** Parse `?principal=6000&ratePct=18` into a prefill object (unknown/NaN values dropped). */
export function parsePrefill(search: string | URLSearchParams): ToolPrefill {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const out: ToolPrefill = {};
  params.forEach((value, key) => {
    const n = Number(value);
    if (value.trim() !== '' && Number.isFinite(n)) out[key] = n;
  });
  return out;
}
