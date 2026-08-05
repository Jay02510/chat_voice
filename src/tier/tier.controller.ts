import { Controller, Get, Put, Post, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TierService } from './tier.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tiers')
export class TierController {
  constructor(private readonly tierService: TierService) {}

  @Get()
  getAllTiers() {
    return this.tierService.getAllTiers();
  }

  @Get(':key')
  getTierByKey(@Param('key') key: string) {
    return this.tierService.getTierByKey(key);
  }

  @Put(':id')
  updateTier(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.tierService.updateTier(id, body);
  }

  @Post(':id/criteria')
  addCriteriaItem(@Param('id', ParseIntPipe) tierId: number, @Body() body: any) {
    return this.tierService.addCriteriaItem(tierId, body);
  }

  @Put('criteria/:criteriaId')
  updateCriteriaItem(@Param('criteriaId', ParseIntPipe) criteriaId: number, @Body() body: any) {
    return this.tierService.updateCriteriaItem(criteriaId, body);
  }

  @Delete('criteria/:criteriaId')
  deleteCriteriaItem(@Param('criteriaId', ParseIntPipe) criteriaId: number) {
    return this.tierService.deleteCriteriaItem(criteriaId);
  }
}
