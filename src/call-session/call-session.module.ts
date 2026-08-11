import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CallSessionService } from './call-session.service';
import { CallSessionController } from './call-session.controller';
import { EvaluationService } from './evaluation.service';
import { SessionAccessService } from './session-access.service';
import { CallLogModule } from '../call-log/call-log.module';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '7d' },
    }),
    CallLogModule,
    CandidateModule,
  ],
  controllers: [CallSessionController],
  providers: [CallSessionService, EvaluationService, SessionAccessService],
  exports: [EvaluationService, SessionAccessService],
})
export class CallSessionModule {}
