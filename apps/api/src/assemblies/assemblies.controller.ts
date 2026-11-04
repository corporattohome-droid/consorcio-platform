import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AssembliesService } from './assemblies.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('assemblies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('assemblies')
export class AssembliesController {
  constructor(private assembliesService: AssembliesService) {}

  @Post() @Roles(UserRole.MANAGER) @ApiOperation({ summary: 'Agendar assembleia' })
  async schedule(
    @Body('groupId') groupId: string,
    @Body('scheduledAt') scheduledAt: string,
    @Body('assemblyNumber') assemblyNumber: number,
    @Body('bidCloseTime') bidCloseTime?: string,
  ) {
    return this.assembliesService.schedule(groupId, new Date(scheduledAt), assemblyNumber, bidCloseTime ? new Date(bidCloseTime) : undefined)
  }

  @Get() @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Listar assembleias' })
  async findAll(@Query('groupId') groupId?: string) { return this.assembliesService.findAll(groupId) }

  @Get(':id') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Detalhar assembleia' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.assembliesService.findOne(id) }

  @Post(':id/bids') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Registrar lance em assembleia' })
  async registerBid(
    @Param('id', ParseUUIDPipe) assemblyId: string,
    @Body('quotaId') quotaId: string,
    @Body('bidAmount') bidAmount: number,
  ) { return this.assembliesService.registerBid(assemblyId, quotaId, bidAmount) }

  @Post(':id/draw') @Roles(UserRole.MANAGER) @ApiOperation({ summary: 'Executar sorteio da assembleia — DEMONSTRATIVO' })
  async executeDraw(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.assembliesService.executeDraw(id, req.user.sub)
  }
}
