import { Controller, Get, Query } from '@nestjs/common';
import { ReferencesService } from './references.service';

@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Get('domains')
  async getDomains(@Query('search') search?: string) {
    const data = await this.referencesService.searchDomains(search);
    return { data };
  }

  @Get('skills')
  async getSkills(
    @Query('search') search?: string,
    @Query('domain') domain?: string,
  ) {
    const data = await this.referencesService.searchSkills(search, domain);
    return { data };
  }
}
