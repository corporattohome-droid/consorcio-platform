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
        planId: dto.planId,
        totalQuotas: dto.totalQuotas,
        creditAmount: new Decimal(dto.creditAmount).toString(),
        termMonths: dto.termMonths,
        adminFeeRate: new Decimal(dto.adminFeeRate).toString(),
        reserveFundRate: new Decimal(dto.reserveFundRate ?? 0).toString(),
        insuranceRate: new Decimal(dto.insuranceRate ?? 0).toString(),
        status: GroupStatus.DRAFT,
      },
    })
  }

  async findAll(params: { page?: number; limit?: number; status?: GroupStatus }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.status) where.status = params.status

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
        assemblies: { orderBy: { scheduledDate: 'desc' }, take: 5 },
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
        where: { id }, data: { status: GroupStatus.OPEN_FOR_ENROLLMENT },
      })

      const existingQuotas = await tx.quota.count({ where: { groupId: id } })
      if (existingQuotas === 0) {
        const quotasData = Array.from({ length: group.totalQuotas }, (_, i) => ({
          groupId: id,
          quotaNumber: String(i + 1).padStart(4, '0'),
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
    if (group.status !== GroupStatus.OPEN_FOR_ENROLLMENT) {
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
      where: { id }, data: { status: GroupStatus.ACTIVE },
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
