import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { InstallmentsService } from './installments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('installments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('installments')
export class InstallmentsController {
  constructor(private installmentsService: InstallmentsService) {}

  @Post('generate') @Roles(UserRole.ANALYST) @ApiOperation({ summary: 'Gerar cronograma de parcelas para cota' })
  async generate(@Body('quotaId') quotaId: string, @Body('startDate') startDate: string) {
    return this.installmentsService.generateSchedule(quotaId, new Date(startDate))
  }

  @Get('quota/:quotaId') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Listar parcelas de uma cota' })
  async findByQuota(@Param('quotaId', ParseUUIDPipe) quotaId: string) {
    return this.installmentsService.findByQuota(quotaId)
  }

  @Get('overdue') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Listar todas as parcelas em atraso' })
  async findOverdue() { return this.installmentsService.findOverdue() }

  @Post('quota/:quotaId/adjustment') @Roles(UserRole.MANAGER) @ApiOperation({ summary: 'Aplicar ajuste percentual às parcelas pendentes' })
  async applyAdjustment(
    @Param('quotaId', ParseUUIDPipe) quotaId: string,
    @Body('reason') reason: string,
    @Body('percentChange') percentChange: number,
    @Body('operatorId') operatorId: string,
  ) { return this.installmentsService.applyAdjustment(quotaId, reason, percentChange, operatorId) }
}
