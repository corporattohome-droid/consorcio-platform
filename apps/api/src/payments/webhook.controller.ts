import { Controller, Post, Body, Headers, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger'
import { PaymentsService } from './payments.service'
import { Public } from '../auth/decorators/public.decorator'

@ApiTags('payments')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(private paymentsService: PaymentsService) {}

  @Post('payment')
  @Public()
  @ApiOperation({
    summary: 'Endpoint de webhook para notificações de pagamento',
    description:
      'Recebe notificações assíncronas de provedores de pagamento. ' +
      'PENDENTE: implementar verificação HMAC do provider antes do deploy em produção.',
  })
  async receivePaymentWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Headers('x-webhook-signature') signature: string,
  ) {
    if (!idempotencyKey) {
      this.logger.warn('Webhook recebido sem X-Idempotency-Key')
      return { status: 'ignored', reason: 'missing_idempotency_key' }
    }
    // TODO(produção): verificar assinatura HMAC do payload antes de processar
    return this.paymentsService.processWebhook(payload, idempotencyKey)
  }
}
