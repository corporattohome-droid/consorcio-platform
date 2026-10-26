import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { QuotaStatus } from '@prisma/client'

@Injectable()
export class QuotasService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { groupId?: string; customerId?: string; status?: QuotaStatus; page?: number; limit?: number }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.groupId) where.groupId = params.groupId
    if (params.status) where.status = params.status
    if (params.customerId) {
      where.contracts = { some: { customerId: params.customerId, status: { in: ['ACTIVE', 'SIGNED'] } } }
    }
    const [total, data] = await Promise.all([
      this.prisma.quota.count({ where }),
      this.prisma.quota.findMany({
        where, skip, take: limit, orderBy: { quotaNumber: 'asc' },
        include: {
          group: { select: { code: true, name: true, category: true } },
          contracts: {
            where: { status: { in: ['ACTIVE', 'SIGNED'] } },
            select: { customerId: true, customer: { select: { fullName: true, taxIdMasked: true } } },
            take: 1,
          },
        },
      }),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string) {
    const quota = await this.prisma.quota.findUnique({
      where: { id },
      include: {
        group: true,
        installments: { orderBy: { installmentNumber: 'asc' }, take: 5 },
        contracts: {
          include: { customer: { select: { fullName: true, taxIdMasked: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!quota) throw new NotFoundException(`Cota ${id} não encontrada`)
    return quota
  }

  async assignToCustomer(quotaId: string, customerId: string, operatorId: string) {
    const [quota, customer] = await Promise.all([
      this.prisma.quota.findUnique({ where: { id: quotaId } }),
      this.prisma.customer.findUnique({ where: { id: customerId } }),
    ])
    if (!quota) throw new NotFoundException('Cota não encontrada')
    if (!customer) throw new NotFoundException('Cliente não encontrado')
    if (quota.status !== QuotaStatus.AVAILABLE) {
      throw new ConflictException(`Cota ${quotaId} não está disponível (status: ${quota.status})`)
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.quota.update({
        where: { id: quotaId }, data: { status: QuotaStatus.RESERVED },
      })
      await tx.quotaOwnershipHistory.create({
        data: { quotaId, customerId, transferredById: operatorId, reason: 'ASSIGNMENT' },
      })
      return tx.quota.findUnique({ where: { id: quotaId }, include: { group: true } })
    })
  }

  async transfer(quotaId: string, toCustomerId: string, reason: string, operatorId: string) {
    const quota = await this.prisma.quota.findUnique({
      where: { id: quotaId },
      include: { installments: { where: { status: 'OVERDUE' } } },
    })
    if (!quota) throw new NotFoundException('Cota não encontrada')
    if (quota.installments.length > 0) {
      throw new BadRequestException('Cota possui parcelas vencidas. Regularize antes de transferir.')
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.quotaOwnershipHistory.updateMany({
        where: { quotaId, leftAt: null },
        data: { leftAt: new Date() },
      })
      await tx.quotaOwnershipHistory.create({
        data: { quotaId, customerId: toCustomerId, transferredById: operatorId, reason },
      })
      return tx.quota.findUnique({ where: { id: quotaId } })
    })
  }
}
