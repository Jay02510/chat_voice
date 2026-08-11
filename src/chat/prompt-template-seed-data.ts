// Real prompt-template content transcribed from VOTEST 시나리오 구성 (Scenario, Persona,
// Level templates).xlsx — kept as JSON (not a TS literal) so the compiler never has to
// structurally type-check it. Regenerate from source if the spec file changes.
import { readFileSync } from 'fs';
import { join } from 'path';

export interface PromptTemplateSeed {
  common: {
    base: string;
    endRules: string;
    prohibitions: string;
  };
  customization: {
    sales: { infoTemplate: string; rules: string };
    interview: { infoTemplate: string; rules: string };
  };
  tone: Record<string, Record<string, string>>; // workType -> tierKey -> bundled tone text
  scenarios: Record<string, { startingLine: string; scenarioRules: string; exampleSituation: string }>;
}

const raw = readFileSync(join(__dirname, 'prompt-template-seed-data.json'), 'utf-8');
export const PROMPT_TEMPLATE_SEED = JSON.parse(raw) as PromptTemplateSeed;
