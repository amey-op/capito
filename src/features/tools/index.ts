/**
 * Tool registry and embed (Aryan's lane, R1). A0 ships only this placeholder so the lesson
 * player (A1) and Predict links (N3) compile against the contract in src/core/tools.ts.
 */
import type { ConfigToolId, ToolDef } from '@/core/tools';

export { ToolEmbed } from './ToolEmbed';

/** id → ToolDef for the config calculators. R1 fills this. */
export const toolRegistry: Partial<Record<ConfigToolId, ToolDef>> = {};
