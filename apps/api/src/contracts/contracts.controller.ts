import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ContractsService } from './contracts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, ContractStatus } from '@prisma/client'

@ApiTags('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('contracts')
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Post() @Roles(UserRole.ANALYST) @ApiOperation({ summary: 'Criar contrato para cota/cliente' })
  async create(@Body('quotaId') quotaId: string, @Body('customerId') customerId: string, @Request() req: any) {
    return this.contractsService.create(quotaId, customerId, req.user.sub)
  }

  @Get() @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Listar contratos' })
  async findAll(@Query('customerId') customerId?: string, @Query('quotaId') quotaId?: string, @Query('status') status?: ContractStatus, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.contractsService.findAll({ customerId, quotaId, status, page, limit })
  }

  @Get(':id') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Detalhar contrato' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.contractsService.findOne(id) }

  @Patch(':id/sign') @Roles(UserRole.MANAGER) @ApiOperation({ summary: 'Assinar contrato' })
  async sign(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contractsService.sign(id, req.user.sub)
  }
}
