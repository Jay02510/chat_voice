import { Test, TestingModule } from '@nestjs/testing';
import { CallSessionService } from './call-session.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CallSessionService', () => {
  let service: CallSessionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallSessionService,
        {
          provide: PrismaService,
          useValue: {
            callSession: {
              create: jest.fn().mockResolvedValue({ id: 1, candidateId: 2, status: 'ACTIVE' }),
              update: jest.fn().mockResolvedValue({ id: 1, status: 'COMPLETED' }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CallSessionService>(CallSessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start a session', async () => {
    const session = await service.startSession(2);
    expect(prisma.callSession.create).toHaveBeenCalledWith({
      data: { candidateId: 2, status: 'ACTIVE' },
    });
    expect(session.id).toEqual(1);
    expect(session.status).toEqual('ACTIVE');
  });

  it('should end a session', async () => {
    const session = await service.endSession(1);
    expect(prisma.callSession.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    }));
    expect(session.status).toEqual('COMPLETED');
  });
});
