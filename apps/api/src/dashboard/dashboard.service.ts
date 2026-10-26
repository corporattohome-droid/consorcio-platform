import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminSummary() {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    const [
      totalCustomers, activeCustomers, totalGroups, activeGroups,
      totalQuotas, contemplatedQuotas, overdueInstallments, paymentsThisMonth,
      totalContemplated, nextAssembly,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.consortiumGroup.count(),
      this.prisma.consortiumGroup.count({ where: { status: 'ACTIVE' } }),
      this.prisma.quota.count(),
      this.prisma.quota.count({ where: { contemplationStatus: { not: 'NOT_CONTEMPLATED' } } }),
      this.prisma.installment.count({ where: { status: 'OVERDUE' } }),
      this.prisma.payment.aggregate({
        where: { paidAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      this.prisma.contemplation.count({ where: { status: { in: ['APPROVED', 'CREDIT_RELEASED'] } } }),
      this.prisma.assembly.findFirst({
        where: { scheduledAt: { gte: now }, status: 'SCHEDULED' },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true, group: { select: { code: true } } },
      }),
    ])

    const monthlyEvolution = await this.getMonthlyEvolution()
    const delinquencyByGroup = await this.getDelinquencyByGroup()
    const categoryDistribution = await this.getCategoryDistribution()

    return {
      customers: { total: totalCustomers, active: activeCustomers },
      groups: { total: totalGroups, active: activeGroups },
      quotas: { total: totalQuotas, contemplated: contemplatedQuotas },
      financial: {
        paymentsThisMonth: paymentsThisMonth._sum.amount ? new Decimal(paymentsThisMonth._sum.amount).toNumber() : 0,
        overdueInstallments,
        totalContemplated,
      },
      nextAssembly,
      monthlyEvolution,
      delinquencyByGroup,
      categoryDistribution,
    }
  }

  async getClientDashboard(customerId: string) {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    const contracts = await this.prisma.contract.findMany({
      where: { customerId, status: { in: ['ACTIVE', 'SIGNED'] } },
      include: { quota: { select: { id: true, creditValue: true } } },
    })

    const quotaIds = contracts.map((c) => c.quota.id)
    const totalCreditValue = contracts.reduce(
      (sum, c) => sum.plus(new Decimal(c.quota.creditValue)), new Decimal(0)
    ).toNumber()

    const [installmentsDueThisMonth, upcomingInstallments, nextAssembly] = await Promise.all([
      this.prisma.installment.count({
        where: { quotaId: { in: quotaIds }, dueDate: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }, status: { not: 'PAID' } },
      }),
      this.prisma.installment.findMany({
        where: { quotaId: { in: quotaIds }, status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: { id: true, installmentNumber: true, totalAmount: true, dueDate: true, status: true },
      }),
      this.prisma.assembly.findFirst({
        where: { scheduledAt: { gte: now }, status: 'SCHEDULED', group: { quotas: { some: { id: { in: quotaIds } } } } },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      }),
    ])

    return {
      totalQuotas: quotaIds.length,
      totalCreditValue,
      installmentsDueThisMonth,
      nextAssemblyDate: nextAssembly?.scheduledAt,
      upcomingInstallments,
    }
  }

  private async getMonthlyEvolution() {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
    return Promise.all(
      months.map(async (month) => {
        const start = startOfMonth(month)
        const end = endOfMonth(month)
        const [payments, newCustomers, newContracts] = await Promise.all([
          this.prisma.payment.aggregate({
            where: { paidAt: { gte: start, lte: end }, status: 'CONFIRMED' },
            _sum: { amount: true },
          }),
          this.prisma.customer.count({ where: { createdAt: { gte: start, lte: end } } }),
          this.prisma.contract.count({ where: { createdAt: { gte: start, lte: end } } }),
        ])
        return {
          month: format(month, 'MMM/yy'),
          payments: payments._sum.amount ? new Decimal(payments._sum.amount).toNumber() : 0,
          newCustomers,
          newContracts,
        }
      })
    )
  }

  private async getDelinquencyByGroup() {
    const groups = await this.prisma.consortiumGroup.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, code: true, name: true },
    })
    return Promise.all(
      groups.map(async (g) => {
        const [total, overdue] = await Promise.all([
          this.prisma.installment.count({ where: { quota: { groupId: g.id }, status: { not: 'PAID' } } }),
          this.prisma.installment.count({ where: { quota: { groupId: g.id }, status: 'OVERDUE' } }),
        ])
        return { groupCode: g.code, groupName: g.name, total, overdue, rate: total > 0 ? overdue / total : 0 }
      })
    )
  }

  private async getCategoryDistribution() {
    return this.prisma.consortiumGroup.groupBy({
      by: ['category'],
      _count: { category: true },
      _sum: { totalQuotas: true },
    })
  }
}
