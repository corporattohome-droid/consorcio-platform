import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { GroupsService } from './groups.service'
import { CreateGroupDto } from './dto/create-group.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, GroupStatus } from '@prisma/client'

@ApiTags('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post() @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Criar novo grupo de consórcio' })
  async create(@Body() dto: CreateGroupDto) { return this.groupsService.create(dto) }

  @Get() @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Listar grupos' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: GroupStatus, @Query('category') category?: string) {
    return this.groupsService.findAll({ page, limit, status, category })
  }

  @Get(':id') @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Detalhar grupo por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.groupsService.findOne(id) }

  @Patch(':id/open-enrollment') @Roles(UserRole.MANAGER) @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abrir grupo para adesão e criar cotas' })
  async openForEnrollment(@Param('id', ParseUUIDPipe) id: string) { return this.groupsService.openForEnrollment(id) }

  @Patch(':id/activate') @Roles(UserRole.MANAGER) @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar grupo (requer ≥50% cotas vendidas)' })
  async activate(@Param('id', ParseUUIDPipe) id: string) { return this.groupsService.activate(id) }
}
