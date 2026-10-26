import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PaymentsService } from './payments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('test')
  @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: '[APENAS DEV/HML] Registrar pagamento de teste' })
  async registerTest(
    @Body('quotaId') quotaId: string,
    @Body('amount') amount: number,
    @Request() req: any,
  ) { return this.paymentsService.registerTestPayment(quotaId, amount, req.user.sub) }

  @Get('quota/:quotaId')
  @Roles(UserRole.CASHIER)
  @ApiOperation({ summary: 'Listar pagamentos de uma cota' })
  async findByQuota(@Param('quotaId', ParseUUIDPipe) quotaId: string) {
    return this.paymentsService.findByQuota(quotaId)
  }
}
