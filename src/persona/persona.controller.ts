import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { PersonaService } from './persona.service';
import type { PersonaInput } from './persona.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Post()
  create(@Body() body: PersonaInput) {
    return this.personaService.create(body);
  }

  @Get()
  findAll() {
    return this.personaService.findAll();
  }

  @Get('active')
  findActive(@Query('mode') mode?: string) {
    return this.personaService.findActive(mode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.personaService.findOne(+id);
  }

  @Put(':id/activate')
  setActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.personaService.setActive(+id, isActive ?? true);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: PersonaInput) {
    return this.personaService.update(+id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.personaService.delete(+id);
  }
}
