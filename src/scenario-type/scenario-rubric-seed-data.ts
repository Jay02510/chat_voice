// Rubric content is transcribed from VOTEST_시나리오별 스코어링.xlsx (regenerate from
// source if it changes) and kept as plain JSON — not a TS literal — so the compiler
// never has to structurally type-check ~1400 nested object literals.
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ScenarioRubricItem {
  category: string;
  code: string;
  title: string;
  description: string;
  weight: number;
  maxScore: number;
  scoreSteps: { step: number; label: string; score: number }[];
}

export interface ScenarioTypeSeed {
  key: string;
  label: string;
  workType: 'INBOUND_SALES' | 'OUTBOUND_SALES' | 'INTERVIEW';
  order: number;
}

interface SeedFile {
  scenarioTypes: ScenarioTypeSeed[];
  rubrics: Record<string, Record<string, ScenarioRubricItem[]>>;
}

const raw = readFileSync(join(__dirname, 'scenario-rubric-seed-data.json'), 'utf-8');
const seed = JSON.parse(raw) as SeedFile;

export const SCENARIO_TYPES: ScenarioTypeSeed[] = seed.scenarioTypes;

// scenarioKey -> tierKey ('beginner' | 'intermediate' | 'advanced') -> rubric items
export const SCENARIO_RUBRICS: Record<string, Record<string, ScenarioRubricItem[]>> = seed.rubrics;
