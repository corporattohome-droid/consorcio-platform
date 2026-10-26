import { Controller, Get, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Indicadores consolidados para o painel administrativo' })
  async getAdminSummary() { return this.dashboardService.getAdminSummary() }

  @Get('client')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Indicadores do portal do cliente (dados do próprio consorciado)' })
  async getClientDashboard(@Request() req: any) {
    if (!req.user.customerId) return { totalQuotas: 0, totalCreditValue: 0, installmentsDueThisMonth: 0, upcomingInstallments: [] }
    return this.dashboardService.getClientDashboard(req.user.customerId)
  }
}
