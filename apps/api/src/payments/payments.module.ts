import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { WebhookController } from './webhook.controller'
import { PaymentsService } from './payments.service'

@Module({ controllers: [PaymentsController, WebhookController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}
