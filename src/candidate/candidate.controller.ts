import { Controller, Get, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCandidateDto } from './dto/create-candidate.dto';

@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  // Admin-only: creates a candidate and issues their magic link
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCandidateDto: CreateCandidateDto) {
    return this.candidateService.create(createCandidateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.candidateService.findAll();
  }

  @Get('public/magic/:token')
  async findByMagicToken(@Param('token') token: string) {
    const candidate = await this.candidateService.findByMagicToken(token);
    if (!candidate) {
      throw new NotFoundException('Invalid or expired test magic link.');
    }
    return candidate;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidateService.findOne(+id);
  }
}
