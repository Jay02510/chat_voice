import { Test, TestingModule } from '@nestjs/testing';
import { CallSessionService } from './call-session.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from './evaluation.service';

describe('CallSessionService', () => {
  let service: CallSessionService;
  let prisma: PrismaService;
  let evaluationService: EvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallSessionService,
        {
          provide: PrismaService,
          useValue: {
            persona: {
              findUnique: jest.fn(),
            },
            callSession: {
              create: jest.fn().mockResolvedValue({ id: 1, candidateId: 2, status: 'ACTIVE' }),
              // endSession checks current status first to guard against a
              // concurrent double-call — null means "not already completed",
              // falling through to the normal update path below.
              findUnique: jest.fn().mockResolvedValue(null),
              update: jest.fn().mockResolvedValue({ id: 1, status: 'COMPLETED', candidate: null }),
            },
          },
        },
        {
          provide: EvaluationService,
          useValue: {
            evaluateSession: jest.fn().mockResolvedValue({ overallScore: 80 }),
          },
        },
      ],
    }).compile();

    service = module.get<CallSessionService>(CallSessionService);
    prisma = module.get<PrismaService>(PrismaService);
    evaluationService = module.get<EvaluationService>(EvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start a session', async () => {
    const session = await service.startSession(2);
    expect(prisma.callSession.create).toHaveBeenCalledWith({
      data: {
        candidateId: 2,
        personaId: null,
        tierId: null,
        scenarioTypeId: null,
        status: 'ACTIVE',
        magicToken: expect.any(String),
        expiresAt: expect.any(Date),
        consentAt: null,
      },
    });
    expect(session.id).toEqual(1);
    expect(session.status).toEqual('ACTIVE');
  });

  it('should end a session and attach its evaluation', async () => {
    const session = await service.endSession(1);
    expect(prisma.callSession.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    }));
    expect(evaluationService.evaluateSession).toHaveBeenCalledWith(1);
    expect(session.status).toEqual('COMPLETED');
    expect(session.evaluation).toEqual({ overallScore: 80 });
  });
});
