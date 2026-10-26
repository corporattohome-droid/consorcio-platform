import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { QuotasService } from './quotas.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, QuotaStatus } from '@prisma/client'

@ApiTags('quotas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('quotas')
export class QuotasController {
  constructor(private quotasService: QuotasService) {}

  @Get() @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Listar cotas com filtros' })
  async findAll(
    @Query('groupId') groupId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: QuotaStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) { return this.quotasService.findAll({ groupId, customerId, status, page, limit }) }

  @Get(':id') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Detalhar cota' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.quotasService.findOne(id) }

  @Post(':id/assign') @Roles(UserRole.ANALYST) @ApiOperation({ summary: 'Atribuir cota a cliente' })
  async assign(
    @Param('id', ParseUUIDPipe) quotaId: string,
    @Body('customerId') customerId: string,
    @Request() req: any,
  ) { return this.quotasService.assignToCustomer(quotaId, customerId, req.user.sub) }

  @Post(':id/transfer') @Roles(UserRole.MANAGER) @ApiOperation({ summary: 'Transferir cota para outro titular' })
  async transfer(
    @Param('id', ParseUUIDPipe) quotaId: string,
    @Body('toCustomerId') toCustomerId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) { return this.quotasService.transfer(quotaId, toCustomerId, reason, req.user.sub) }
}
