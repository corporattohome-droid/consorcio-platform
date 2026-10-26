import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { CustomersService } from './customers.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole, CustomerStatus } from '@prisma/client'

@ApiTags('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post() @Roles(UserRole.ANALYST) @ApiOperation({ summary: 'Cadastrar novo cliente' })
  async create(@Body() dto: CreateCustomerDto) { return this.customersService.create(dto) }

  @Get() @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Listar clientes com filtros e paginação' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string, @Query('status') status?: CustomerStatus) {
    return this.customersService.findAll({ page, limit, search, status })
  }

  @Get(':id') @Roles(UserRole.CASHIER) @ApiOperation({ summary: 'Detalhar cliente por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.customersService.findOne(id) }

  @Put(':id') @Roles(UserRole.ANALYST) @ApiOperation({ summary: 'Atualizar dados do cliente' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) { return this.customersService.update(id, dto) }

  @Patch(':id/status') @Roles(UserRole.MANAGER) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Alterar status do cliente' })
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: CustomerStatus) { return this.customersService.updateStatus(id, status) }
}
