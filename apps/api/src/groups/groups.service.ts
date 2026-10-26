import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { CreateGroupDto } from './dto/create-group.dto'
import { GroupStatus } from '@prisma/client'
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    const code = await this.generateCode()
    return this.prisma.consortiumGroup.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        totalQuotas: dto.totalQuotas,
        creditValue: new Decimal(dto.creditValue).toString(),
        termMonths: dto.termMonths,
        adminFeePercent: new Decimal(dto.adminFeePercent).toString(),
        reserveFundPercent: new Decimal(dto.reserveFundPercent ?? 0).toString(),
        insurancePercent: new Decimal(dto.insurancePercent ?? 0).toString(),
        enrollmentStartDate: dto.enrollmentStartDate ? new Date(dto.enrollmentStartDate) : undefined,
        enrollmentEndDate: dto.enrollmentEndDate ? new Date(dto.enrollmentEndDate) : undefined,
        expectedStartDate: dto.expectedStartDate ? new Date(dto.expectedStartDate) : undefined,
        internalNotes: dto.internalNotes,
        status: GroupStatus.DRAFT,
      },
    })
  }

  async findAll(params: { page?: number; limit?: number; status?: GroupStatus; category?: string }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.status) where.status = params.status
    if (params.category) where.category = params.category

    const [total, data] = await Promise.all([
      this.prisma.consortiumGroup.count({ where }),
      this.prisma.consortiumGroup.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { _count: { select: { quotas: true } } },
      }),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string) {
    const group = await this.prisma.consortiumGroup.findUnique({
      where: { id },
      include: {
        _count: { select: { quotas: true, assemblies: true } },
        assemblies: { orderBy: { scheduledAt: 'desc' }, take: 5 },
      },
    })
    if (!group) throw new NotFoundException(`Grupo ${id} não encontrado`)
    return group
  }

  async openForEnrollment(id: string) {
    const group = await this.findOne(id)
    if (group.status !== GroupStatus.DRAFT) {
      throw new ConflictException('Apenas grupos em rascunho podem ser abertos para adesão')
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.consortiumGroup.update({
        where: { id }, data: { status: GroupStatus.ENROLLMENT },
      })

      const existingQuotas = await tx.quota.count({ where: { groupId: id } })
      if (existingQuotas === 0) {
        const quotasData = Array.from({ length: group.totalQuotas }, (_, i) => ({
          groupId: id,
          quotaNumber: i + 1,
          creditValue: group.creditValue,
          installmentAmount: new Decimal(group.creditValue)
            .plus(new Decimal(group.creditValue).mul(new Decimal(group.adminFeePercent).div(100)))
            .plus(new Decimal(group.creditValue).mul(new Decimal(group.reserveFundPercent).div(100)))
            .plus(new Decimal(group.creditValue).mul(new Decimal(group.insurancePercent).div(100)))
            .div(group.termMonths)
            .toDecimalPlaces(2)
            .toString(),
          totalInstallments: group.termMonths,
        }))
        await tx.quota.createMany({ data: quotasData })
      }

      return tx.consortiumGroup.findUnique({ where: { id } })
    })
  }

  async activate(id: string) {
    const group = await this.prisma.consortiumGroup.findUnique({
      where: { id },
      include: { _count: { select: { quotas: true } } },
    })
    if (!group) throw new NotFoundException(`Grupo ${id} não encontrado`)
    if (group.status !== GroupStatus.ENROLLMENT) {
      throw new ConflictException('Apenas grupos em período de adesão podem ser ativados')
    }

    const soldQuotas = await this.prisma.quota.count({
      where: { groupId: id, status: { not: 'AVAILABLE' } },
    })
    const fillRate = soldQuotas / group.totalQuotas
    if (fillRate < 0.5) {
      throw new BadRequestException(
        `Taxa de adesão insuficiente: ${Math.round(fillRate * 100)}% (mínimo 50%)`
      )
    }

    return this.prisma.consortiumGroup.update({
      where: { id }, data: { status: GroupStatus.ACTIVE, actualStartDate: new Date() },
    })
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `GRP-${year}-`
    const last = await this.prisma.consortiumGroup.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    })
    const seq = last ? parseInt(last.code.replace(prefix, ''), 10) + 1 : 1
    return `${prefix}${String(seq).padStart(3, '0')}`
  }
}
