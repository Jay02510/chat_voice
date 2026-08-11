import { deriveCategoryMaxes, deriveCategoryTotals } from './category-score.util';

// Mirrors the deterministic post-processing logic in EvaluationService.evaluateSession:
// LLM picks a stepIndex, code looks up the achieved score — these tests cover that
// lookup/clamp/aggregation logic directly, since it's what makes scoring internally
// consistent (previously the LLM could independently disagree with itself on totals).
describe('deterministic rubric scoring', () => {
  const criteria = [
    { code: 'BS001', title: '오프닝 인사', category: '기본점수', maxScore: 10, weight: 1, scoreSteps: JSON.stringify([{ label: '없음', score: 0 }, { label: '일부', score: 5 }, { label: '완전', score: 10 }]) },
    { code: 'E0001', title: '본인확인', category: '필수요소 [Essential]', maxScore: 15, weight: 1, scoreSteps: JSON.stringify([{ label: '없음', score: 0 }, { label: '시도', score: 7 }, { label: '완료', score: 15 }]) },
  ];

  function parseSteps(raw: string) {
    return JSON.parse(raw);
  }

  function resolveRubricResults(criteriaList: typeof criteria, llmResults: Array<{ code: string; stepIndex: number }>) {
    const byCode = new Map(criteriaList.map((c) => [c.code, c]));
    return llmResults
      .map((r) => {
        const item = byCode.get(r.code);
        if (!item) return null;
        const steps = parseSteps(item.scoreSteps);
        const stepIndex = Math.max(0, Math.min(Math.round(r.stepIndex ?? 0), Math.max(steps.length - 1, 0)));
        return { code: item.code, title: item.title, category: item.category, achievedScore: steps[stepIndex].score, maxScore: item.maxScore, weight: item.weight, stepIndex };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }

  it('looks up the deterministic score for a valid stepIndex', () => {
    const results = resolveRubricResults(criteria, [{ code: 'BS001', stepIndex: 1 }]);
    expect(results[0].achievedScore).toBe(5);
  });

  it('clamps an out-of-range stepIndex into the valid range', () => {
    const tooHigh = resolveRubricResults(criteria, [{ code: 'BS001', stepIndex: 99 }]);
    expect(tooHigh[0].achievedScore).toBe(10);

    const negative = resolveRubricResults(criteria, [{ code: 'BS001', stepIndex: -3 }]);
    expect(negative[0].achievedScore).toBe(0);
  });

  it('drops a hallucinated rubric code that does not match a real criteria item', () => {
    const results = resolveRubricResults(criteria, [{ code: 'FAKE999', stepIndex: 2 }]);
    expect(results).toEqual([]);
  });

  it('category totals always equal the sum of that category\'s rubricResults — cannot disagree', () => {
    const results = resolveRubricResults(criteria, [
      { code: 'BS001', stepIndex: 2 }, // 10
      { code: 'E0001', stepIndex: 1 }, // 7
    ]);
    const totals = deriveCategoryTotals(results);
    expect(totals.basicScore).toBe(10);
    expect(totals.essentialScore).toBe(7);
    expect(totals.commScore).toBe(0);
  });

  it('overall percentage is computed from achieved/max across all resolved items', () => {
    const results = resolveRubricResults(criteria, [
      { code: 'BS001', stepIndex: 2 }, // 10/10
      { code: 'E0001', stepIndex: 0 }, // 0/15
    ]);
    const totalAchieved = results.reduce((sum, r) => sum + r.achievedScore, 0);
    const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0);
    const overall = (totalAchieved / totalMax) * 100;
    expect(Math.round(overall * 10) / 10).toBeCloseTo(40, 1); // 10/25 = 40%
  });

  it('deriveCategoryMaxes and deriveCategoryTotals use the same needle matching, so a category present in one is present in the other', () => {
    const maxes = deriveCategoryMaxes(criteria);
    expect(maxes.basicMax).toBe(10);
    expect(maxes.essentialMax).toBe(15);
  });
});
