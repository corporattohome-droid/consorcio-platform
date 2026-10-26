import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { ContemplationStatus } from '@prisma/client'

@Injectable()
export class ContemplationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    groupId?: string
    quotaId?: string
    status?: ContemplationStatus
    page?: number
    limit?: number
  }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.groupId) where.assembly = { groupId: params.groupId }
    if (params.quotaId) where.quotaId = params.quotaId
    if (params.status) where.status = params.status

    const [total, data] = await Promise.all([
      this.prisma.contemplation.count({ where }),
      this.prisma.contemplation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quota: { select: { quotaNumber: true, group: { select: { code: true, name: true } } } },
          assembly: { select: { number: true, scheduledDate: true } },
        },
      }),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string) {
    const contemplation = await this.prisma.contemplation.findUnique({
      where: { id },
      include: {
        quota: { include: { group: { select: { code: true, name: true, creditAmount: true } } } },
        assembly: { select: { number: true, scheduledDate: true, status: true } },
        bid: true,
      },
    })
    if (!contemplation) throw new NotFoundException(`Contemplação ${id} não encontrada`)
    return contemplation
  }

  async confirmDocumentation(id: string) {
    const contemplation = await this.prisma.contemplation.findUnique({ where: { id } })
    if (!contemplation) throw new NotFoundException('Contemplação não encontrada')
    if (contemplation.status !== ContemplationStatus.AWAITING_DOCUMENTATION) {
      throw new ConflictException('Contemplação não está aguardando documentação')
    }
    const nextStatus = contemplation.type === 'BID'
      ? ContemplationStatus.CONTEMPLATED_BID
      : ContemplationStatus.CONTEMPLATED_DRAW
    return this.prisma.contemplation.update({
      where: { id },
      data: { status: nextStatus },
    })
  }

  async releaseCredit(id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'DEMONSTRATIVO — liberação de crédito requer homologação junto ao BCB (Lei 11.795/2008)',
      )
    }
    const contemplation = await this.prisma.contemplation.findUnique({ where: { id } })
    if (!contemplation) throw new NotFoundException('Contemplação não encontrada')
    const releasableStatuses: ContemplationStatus[] = [
      ContemplationStatus.CONTEMPLATED_DRAW,
      ContemplationStatus.CONTEMPLATED_BID,
      ContemplationStatus.AWAITING_DOCUMENTATION,
    ]
    if (!releasableStatuses.includes(contemplation.status)) {
      throw new ConflictException('Contemplação não pode ter crédito liberado no status atual')
    }
    return this.prisma.contemplation.update({
      where: { id },
      data: { status: ContemplationStatus.CREDIT_RELEASED },
    })
  }
}
