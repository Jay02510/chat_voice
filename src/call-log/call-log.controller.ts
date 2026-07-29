import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { CallLogService } from './call-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('call-log')
export class CallLogController {
  constructor(private readonly callLogService: CallLogService) {}

  @Post()
  createLog(
    @Body('sessionId') sessionId: number,
    @Body('message') message: string,
    @Body('type') type: string,
  ) {
    return this.callLogService.createLog(sessionId, message, type);
  }

  @Get('session/:sessionId')
  getLogsForSession(@Param('sessionId') sessionId: string) {
    return this.callLogService.getLogsForSession(+sessionId);
  }
}
