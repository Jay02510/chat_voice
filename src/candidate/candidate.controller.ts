import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post()
  create(@Body() createCandidateDto: { name: string; email: string }) {
    return this.candidateService.create(createCandidateDto);
  }

  @Get()
  findAll() {
    return this.candidateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidateService.findOne(+id);
  }
}
