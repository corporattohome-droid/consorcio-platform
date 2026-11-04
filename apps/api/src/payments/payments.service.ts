import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { InstallmentStatus } from '@prisma/client'
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(private prisma: PrismaService) {}

  async registerTestPayment(quotaId: string, amount: number, operatorId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Pagamentos de teste não são permitidos em produção')
    }

    const pending = await this.prisma.installment.findFirst({
      where: { quotaId, status: { in: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] } },
      orderBy: { number: 'asc' },
    })
    if (!pending) throw new NotFoundException('Nenhuma parcela pendente encontrada para esta cota')

    const paidAmount = new Decimal(amount)
    const totalDue = new Decimal(pending.totalAmount)

    if (paidAmount.lessThan(totalDue)) {
      throw new BadRequestException(`Valor insuficiente. Total devido: R$ ${totalDue.toFixed(2)}`)
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          amount: paidAmount.toString(),
          confirmedAt: new Date(),
          method: 'OTHER',
          status: 'CONFIRMED',
          confirmedBy: operatorId,
          externalRef: `TEST-${Date.now()}`,
        },
      })

      let remaining = paidAmount
      const installmentsToAllocate = await tx.installment.findMany({
        where: { quotaId, status: { in: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] } },
        orderBy: { number: 'asc' },
      })

      for (const inst of installmentsToAllocate) {
        if (remaining.isZero()) break
        const due = new Decimal(inst.totalAmount)
        const allocated = Decimal.min(remaining, due)
        remaining = remaining.minus(allocated)
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            installmentId: inst.id,
            allocatedAmount: allocated.toString(),
            allocatedTo: 'INSTALLMENT',
          },
        })
        await tx.installment.update({
          where: { id: inst.id },
          data: { status: InstallmentStatus.PAID, paidAt: new Date() },
        })
      }

      return payment
    })
  }

  async processWebhook(payload: any, idempotencyKey: string) {
    const existing = await this.prisma.chargeWebhookEvent.findUnique({ where: { idempotencyKey } })
    if (existing) {
      this.logger.warn(`Webhook duplicado ignorado: ${idempotencyKey}`)
      return { status: 'duplicate', eventId: existing.id }
    }

    const chargeId = payload.chargeId ?? payload.id ?? idempotencyKey

    const event = await this.prisma.chargeWebhookEvent.upsert({
      where: { idempotencyKey },
      create: {
        idempotencyKey,
        chargeId,
        provider: payload.provider ?? 'UNKNOWN',
        eventType: payload.event,
        payload,
        processedAt: null,
      },
      update: {},
    })

    this.logger.log(`Webhook recebido: ${payload.event} (key: ${idempotencyKey})`)
    return { status: 'received', eventId: event.id }
  }

  async findByQuota(quotaId: string) {
    const quota = await this.prisma.quota.findUnique({ where: { id: quotaId } })
    if (!quota) throw new NotFoundException('Cota não encontrada')
    return this.prisma.payment.findMany({
      where: { allocations: { some: { installment: { quotaId } } } },
      orderBy: { createdAt: 'desc' },
      include: {
        allocations: {
          include: { installment: { select: { number: true, dueDate: true } } },
        },
      },
    })
  }
}
