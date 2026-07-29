import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { PersonaService } from './persona.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Post()
  create(@Body() body: { name: string; prompt: string }) {
    return this.personaService.create(body.name, body.prompt);
  }

  @Get()
  findAll() {
    return this.personaService.findAll();
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.personaService.activate(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; prompt?: string }) {
    return this.personaService.update(+id, body);
  }
}
