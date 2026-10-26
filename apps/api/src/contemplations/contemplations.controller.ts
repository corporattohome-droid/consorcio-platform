import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { ContemplationsService, ContemplateQuotaDto, ReleaseCreditDto } from './contemplations.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@ApiTags('contemplations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contemplations')
export class ContemplationsController {
  constructor(private readonly svc: ContemplationsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'ANALYST', 'AUDITOR')
  @ApiOperation({ summary: 'List all contemplations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'quotaId', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('quotaId') quotaId?: string,
  ) {
    return this.svc.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      quotaId,
    })
  }

  @Get('stats')
  @Roles('ADMIN', 'MANAGER', 'ANALYST', 'AUDITOR')
  @ApiOperation({ summary: 'Get contemplation statistics' })
  getStats() {
    return this.svc.getStats()
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'ANALYST', 'AUDITOR')
  @ApiOperation({ summary: 'Get contemplation by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Contemplate a quota (draw or bid)' })
  contemplateQuota(@Body() dto: ContemplateQuotaDto) {
    return this.svc.contemplateQuota(dto)
  }

  @Patch(':id/schedule-release')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Schedule credit release for a contemplation' })
  scheduleRelease(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<ReleaseCreditDto, 'contemplationId'>,
  ) {
    return this.svc.scheduleRelease({ ...dto, contemplationId: id })
  }

  @Patch(':id/release')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Release credit (DEMONSTRATION — requires regulatory approval)' })
  releaseCredit(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.releaseCredit(id)
  }
}
