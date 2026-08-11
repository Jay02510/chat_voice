// Category max scores vary per scenario/tier rubric — these are derived from the
// actual rubric items graded (never hardcoded), so both the grading prompt
// (evaluation.service.ts) and the coaching prompt (voisor.service.ts) tell the
// LLM the true ceiling for whatever scenario/tier combo the candidate was scored
// against, instead of the legacy generic 50/24/26 split.
export function deriveCategoryMaxes(rubricResults: Array<{ category: string; maxScore: number }>) {
  const categoryMax: Record<string, number> = {};
  for (const c of rubricResults) {
    categoryMax[c.category] = (categoryMax[c.category] || 0) + c.maxScore;
  }
  const findCategoryMax = (needle: string, fallback: number) => {
    const key = Object.keys(categoryMax).find((k) => k.includes(needle));
    return key ? categoryMax[key] : fallback;
  };
  return {
    basicMax: findCategoryMax('기본', 50),
    essentialMax: findCategoryMax('필수요소', 24),
    commMax: findCategoryMax('소통력', 26),
    coreSkillMax: findCategoryMax('핵심', 0),
    advancedSkillMax: findCategoryMax('고난도', 0),
  };
}

// Sibling to deriveCategoryMaxes, same needle-matching, but sums the achieved
// scores actually earned (deterministically looked up from each item's
// scoreSteps by evaluation.service.ts — never LLM-generated) instead of the
// ceilings. This is what makes basicScore/essentialScore/etc. guaranteed to
// equal the sum of the rubricResults in that category, instead of being a
// second, independently-generated number that can silently disagree with it.
export function deriveCategoryTotals(rubricResults: Array<{ category: string; achievedScore: number }>) {
  const categoryTotal: Record<string, number> = {};
  for (const c of rubricResults) {
    categoryTotal[c.category] = (categoryTotal[c.category] || 0) + c.achievedScore;
  }
  const findCategoryTotal = (needle: string) => {
    const key = Object.keys(categoryTotal).find((k) => k.includes(needle));
    return key ? categoryTotal[key] : 0;
  };
  return {
    basicScore: findCategoryTotal('기본'),
    essentialScore: findCategoryTotal('필수요소'),
    commScore: findCategoryTotal('소통력'),
    coreSkillScore: findCategoryTotal('핵심'),
    advancedSkillScore: findCategoryTotal('고난도'),
  };
}
