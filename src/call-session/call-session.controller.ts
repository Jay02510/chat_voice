import { Controller, Post, Body, Param, Put, UseGuards, Get } from '@nestjs/common';
import { CallSessionService } from './call-session.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('call-session')
export class CallSessionController {
  constructor(private readonly callSessionService: CallSessionService) {}

  @Post()
  startSession(@Body('candidateId') candidateId: number) {
    return this.callSessionService.startSession(candidateId);
  }

  @Get()
  findAll() {
    return this.callSessionService.findAll();
  }

  @Put(':id/end')
  endSession(@Param('id') id: string) {
    return this.callSessionService.endSession(+id);
  }
}
