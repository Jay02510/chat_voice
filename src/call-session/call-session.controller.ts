import { Controller, Post, Body, Param, Put, UseGuards, Get, Delete, Headers, NotFoundException, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CallSessionService } from './call-session.service';
import { EvaluationService } from './evaluation.service';
import { SessionAccessService } from './session-access.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CandidateService } from '../candidate/candidate.service';
import { StartPublicSessionDto } from './dto/start-public-session.dto';
import { EndSessionDto } from './dto/end-session.dto';

@Controller('call-session')
export class CallSessionController {
  constructor(
    private readonly callSessionService: CallSessionService,
    private readonly evaluationService: EvaluationService,
    private readonly sessionAccessService: SessionAccessService,
    private readonly candidateService: CandidateService,
  ) {}

  // Admin-initiated session (e.g. self-test from the dashboard)
  @UseGuards(JwtAuthGuard)
  @Post()
  startSession(@Body('candidateId') candidateId: number, @Body('personaId') personaId?: number) {
    return this.callSessionService.startSession(candidateId, personaId);
  }

  // Candidate-initiated session via their magic link — no JWT available
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('public')
  async startPublicSession(@Body() dto: StartPublicSessionDto) {
    if (dto.consentGiven !== true) {
      throw new BadRequestException('Recording and evaluation consent is required to start the test.');
    }
    const candidate = await this.candidateService.findByMagicToken(dto.candidateMagicToken);
    if (!candidate) {
      throw new NotFoundException('Invalid or expired candidate link.');
    }
    return this.callSessionService.startSession(candidate.id, dto.personaId, true);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.callSessionService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/evaluation')
  getEvaluation(@Param('id') id: string) {
    return this.evaluationService.getEvaluation(+id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } }) // triggers a GPT-4o evaluation call — keep tight
  @Put(':id/end')
  async endSession(
    @Param('id') id: string,
    @Body() dto: EndSessionDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.sessionAccessService.verify(+id, dto.sessionToken, authHeader);
    return this.callSessionService.endSession(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteSession(@Param('id') id: string) {
    return this.callSessionService.deleteSession(+id);
  }
}
