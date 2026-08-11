import { Test, TestingModule } from '@nestjs/testing';
import { VoisorService } from './voisor.service';
import { PrismaService } from '../prisma/prisma.service';

const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: 'mock coaching reply' } }],
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

describe('VoisorService', () => {
  let service: VoisorService;

  const buildSession = (overrides: Partial<{ rubricResults: string; riskAndCoaching: string; bantcq: string }> = {}) => ({
    id: 1,
    candidate: { name: '홍길동' },
    logs: [{ type: 'USER_MESSAGE', message: '안녕하세요' }],
    evaluation: {
      overallScore: 72,
      grade: 'Grade B',
      basicScore: 40,
      essentialScore: 12,
      commScore: 10,
      coreSkillScore: 5,
      advancedSkillScore: 0,
      verdictSummary: 'Solid opening, weak closing.',
      rubricResults: overrides.rubricResults ?? JSON.stringify([
        { category: '기본점수', maxScore: 50 },
        { category: '필수요소 [Essential]', maxScore: 15 },
        { category: '소통력', maxScore: 15 },
        { category: '핵심 스킬', maxScore: 20 },
      ]),
      riskAndCoaching: overrides.riskAndCoaching ?? JSON.stringify(['E0001 코칭 지침 1', 'E0002 코칭 지침 2']),
      bantcq: overrides.bantcq ?? JSON.stringify({ attitude: '적극적', communication: '명확함' }),
    },
  });

  beforeEach(async () => {
    mockCreate.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoisorService,
        {
          provide: PrismaService,
          useValue: {
            callSession: {
              findUnique: jest.fn().mockResolvedValue(buildSession()),
            },
          },
        },
      ],
    }).compile();

    service = module.get<VoisorService>(VoisorService);
  });

  it('parses JSON evaluation fields into readable content instead of raw JSON strings', async () => {
    await service.chat(1, '내가 뭘 잘못했어?', undefined, []);

    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(systemPrompt).toContain('- E0001 코칭 지침 1');
    expect(systemPrompt).toContain('- attitude: 적극적');
    expect(systemPrompt).not.toContain('["E0001');
  });

  it('derives real category maxes from rubricResults instead of hardcoded 50/24/26', async () => {
    await service.chat(1, '점수 구성 알려줘', undefined, []);

    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(systemPrompt).toContain('40 / 50');
    expect(systemPrompt).toContain('12 / 15');
    expect(systemPrompt).toContain('10 / 15');
    expect(systemPrompt).toContain('5 / 20');
  });

  it('falls back gracefully when evaluation JSON fields are malformed', async () => {
    (service as any).prisma.callSession.findUnique.mockResolvedValueOnce(
      buildSession({ riskAndCoaching: 'not json', bantcq: 'also not json' }),
    );

    await expect(service.chat(1, 'test', undefined, [])).resolves.toEqual({ reply: 'mock coaching reply' });
  });
});
