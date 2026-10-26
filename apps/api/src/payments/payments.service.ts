import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
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
      orderBy: { installmentNumber: 'asc' },
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
          quotaId,
          amount: paidAmount.toString(),
          paidAt: new Date(),
          method: 'TEST_ADAPTER',
          status: 'CONFIRMED',
          confirmedByUserId: operatorId,
          referenceCode: `TEST-${Date.now()}`,
        },
      })

      let remaining = paidAmount
      const allocations = []

      const installmentsToAllocate = await tx.installment.findMany({
        where: { quotaId, status: { in: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] } },
        orderBy: { installmentNumber: 'asc' },
      })

      for (const inst of installmentsToAllocate) {
        if (remaining.isZero()) break
        const due = new Decimal(inst.totalAmount)
        const allocated = Decimal.min(remaining, due)
        remaining = remaining.minus(allocated)
        allocations.push(tx.paymentAllocation.create({
          data: { paymentId: payment.id, installmentId: inst.id, amount: allocated.toString() },
        }))
        await tx.installment.update({
          where: { id: inst.id },
          data: { paidAmount: allocated.toString(), status: InstallmentStatus.PAID, paidAt: new Date() },
        })
      }

      await Promise.all(allocations)

      const paidCount = await tx.installment.count({ where: { quotaId, status: InstallmentStatus.PAID } })
      await tx.quota.update({ where: { id: quotaId }, data: { paidInstallments: paidCount } })

      return payment
    })
  }

  async processWebhook(payload: any, idempotencyKey: string) {
    const existing = await this.prisma.chargeWebhookEvent.findUnique({ where: { idempotencyKey } })
    if (existing) {
      this.logger.warn(`Webhook duplicado ignorado: ${idempotencyKey}`)
      return { status: 'duplicate', eventId: existing.id }
    }

    const event = await this.prisma.chargeWebhookEvent.upsert({
      where: { idempotencyKey },
      create: {
        idempotencyKey,
        provider: payload.provider ?? 'UNKNOWN',
        eventType: payload.event,
        rawPayload: payload,
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
      where: { quotaId },
      orderBy: { paidAt: 'desc' },
      include: { allocations: { include: { installment: { select: { installmentNumber: true, dueDate: true } } } } },
    })
  }
}
