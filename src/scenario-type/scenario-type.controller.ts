import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ScenarioTypeService } from './scenario-type.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('scenario-types')
export class ScenarioTypeController {
  constructor(private readonly scenarioTypeService: ScenarioTypeService) {}

  @Get()
  getAllScenarioTypes() {
    return this.scenarioTypeService.getAllScenarioTypes();
  }

  @Get(':id/criteria')
  getScenarioTypeCriteria(
    @Param('id', ParseIntPipe) id: number,
    @Query('tierId') tierId?: string,
  ) {
    return this.scenarioTypeService.getScenarioTypeCriteria(
      id,
      tierId ? parseInt(tierId, 10) : undefined,
    );
  }
}
