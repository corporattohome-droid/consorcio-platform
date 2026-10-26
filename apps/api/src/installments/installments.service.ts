import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { InstallmentStatus } from '@prisma/client'
import Decimal from 'decimal.js'
import { addMonths, startOfMonth, endOfMonth } from 'date-fns'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

@Injectable()
export class InstallmentsService {
  constructor(private prisma: PrismaService) {}

  async generateSchedule(quotaId: string, startDate: Date) {
    const quota = await this.prisma.quota.findUnique({
      where: { id: quotaId }, include: { group: true },
    })
    if (!quota) throw new NotFoundException('Cota não encontrada')

    const existing = await this.prisma.installment.count({ where: { quotaId } })
    if (existing > 0) throw new BadRequestException('Cronograma já gerado para esta cota')

    const base = new Decimal(quota.installmentAmount)
    const adminFee = new Decimal(quota.creditValue)
      .mul(new Decimal(quota.group.adminFeePercent).div(100))
      .div(quota.totalInstallments)
      .toDecimalPlaces(2)
    const reserveFund = new Decimal(quota.creditValue)
      .mul(new Decimal(quota.group.reserveFundPercent).div(100))
      .div(quota.totalInstallments)
      .toDecimalPlaces(2)
    const insurance = new Decimal(quota.creditValue)
      .mul(new Decimal(quota.group.insurancePercent).div(100))
      .div(quota.totalInstallments)
      .toDecimalPlaces(2)

    const installments = Array.from({ length: quota.totalInstallments }, (_, i) => {
      const dueDate = startOfMonth(addMonths(startDate, i + 1))
      const total = adminFee.plus(reserveFund).plus(insurance).toDecimalPlaces(2)
      return {
        quotaId,
        installmentNumber: i + 1,
        dueDate,
        baseAmount: base.toString(),
        adminFeeAmount: adminFee.toString(),
        reserveFundAmount: reserveFund.toString(),
        insuranceAmount: insurance.toString(),
        totalAmount: total.toString(),
        status: InstallmentStatus.PENDING,
      }
    })

    await this.prisma.installment.createMany({ data: installments })
    return this.prisma.installment.findMany({ where: { quotaId }, orderBy: { installmentNumber: 'asc' } })
  }

  async findByQuota(quotaId: string) {
    const quota = await this.prisma.quota.findUnique({ where: { id: quotaId } })
    if (!quota) throw new NotFoundException('Cota não encontrada')
    return this.prisma.installment.findMany({
      where: { quotaId }, orderBy: { installmentNumber: 'asc' },
      include: { payments: { select: { amount: true, paidAt: true } } },
    })
  }

  async findOverdue() {
    return this.prisma.installment.findMany({
      where: { status: InstallmentStatus.OVERDUE },
      orderBy: { dueDate: 'asc' },
      include: {
        quota: {
          select: {
            quotaNumber: true,
            group: { select: { code: true, name: true } },
            contracts: { where: { status: { in: ['ACTIVE', 'SIGNED'] } }, include: { customer: { select: { fullName: true, phone: true, email: true } } }, take: 1 },
          },
        },
      },
    })
  }

  async applyAdjustment(quotaId: string, reason: string, percentChange: number, operatorId: string) {
    const quota = await this.prisma.quota.findUnique({ where: { id: quotaId } })
    if (!quota) throw new NotFoundException('Cota não encontrada')
    if (Math.abs(percentChange) > 30) throw new BadRequestException('Ajuste máximo permitido é 30%')

    const multiplier = new Decimal(1).plus(new Decimal(percentChange).div(100))

    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.installment.findMany({
        where: { quotaId, status: { in: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] } },
      })
      await Promise.all(pending.map((inst) =>
        tx.installment.update({
          where: { id: inst.id },
          data: {
            totalAmount: new Decimal(inst.totalAmount).mul(multiplier).toDecimalPlaces(2).toString(),
            adminFeeAmount: new Decimal(inst.adminFeeAmount).mul(multiplier).toDecimalPlaces(2).toString(),
          },
        })
      ))
      return { updated: pending.length, percentChange, reason }
    })
  }
}
