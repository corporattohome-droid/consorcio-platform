import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ContemplationsService } from './contemplations.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, ContemplationStatus } from '@prisma/client'

@ApiTags('contemplations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('contemplations')
export class ContemplationsController {
  constructor(private contemplationsService: ContemplationsService) {}

  @Get() @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Listar contemplações' })
  async findAll(
    @Query('quotaId') quotaId?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: ContemplationStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contemplationsService.findAll({ quotaId, groupId, status, page, limit })
  }

  @Get(':id') @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Detalhar contemplação' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contemplationsService.findOne(id)
  }

  @Patch(':id/confirm-documentation') @Roles(UserRole.MANAGER) @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar documentação recebida da contemplação' })
  async confirmDocumentation(@Param('id', ParseUUIDPipe) id: string) {
    return this.contemplationsService.confirmDocumentation(id)
  }

  @Patch(':id/release') @Roles(UserRole.ADMIN) @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar crédito da contemplação — DEMONSTRATIVO, requer homologação BCB' })
  async releaseCredit(@Param('id', ParseUUIDPipe) id: string) {
    return this.contemplationsService.releaseCredit(id)
  }
}
