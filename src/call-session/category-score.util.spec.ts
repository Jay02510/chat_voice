import { deriveCategoryMaxes } from './category-score.util';

describe('deriveCategoryMaxes', () => {
  it('sums maxScore per category matched by needle substring', () => {
    const result = deriveCategoryMaxes([
      { category: '기본점수', maxScore: 10 },
      { category: '기본점수', maxScore: 20 },
      { category: '필수요소 [Essential]', maxScore: 15 },
      { category: '소통력', maxScore: 12 },
      { category: '핵심 스킬', maxScore: 8 },
      { category: '고난도 스킬 [Advanced]', maxScore: 5 },
    ]);

    expect(result).toEqual({
      basicMax: 30,
      essentialMax: 15,
      commMax: 12,
      coreSkillMax: 8,
      advancedSkillMax: 5,
    });
  });

  it('falls back to legacy defaults when a category is entirely absent', () => {
    const result = deriveCategoryMaxes([
      { category: '기본점수', maxScore: 40 },
    ]);

    expect(result.basicMax).toBe(40);
    expect(result.essentialMax).toBe(24);
    expect(result.commMax).toBe(26);
    expect(result.coreSkillMax).toBe(0);
    expect(result.advancedSkillMax).toBe(0);
  });

  it('returns all defaults for an empty rubric list', () => {
    const result = deriveCategoryMaxes([]);
    expect(result).toEqual({
      basicMax: 50,
      essentialMax: 24,
      commMax: 26,
      coreSkillMax: 0,
      advancedSkillMax: 0,
    });
  });
});
