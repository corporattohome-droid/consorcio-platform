import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { ContemplationStatus } from '@prisma/client'

@Injectable()
export class ContemplationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { quotaId?: string; assemblyId?: string; status?: ContemplationStatus; page?: number; limit?: number }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.quotaId) where.quotaId = params.quotaId
    if (params.assemblyId) where.assemblyId = params.assemblyId
    if (params.status) where.status = params.status

    const [total, data] = await Promise.all([
      this.prisma.contemplation.count({ where }),
      this.prisma.contemplation.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
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
        quota: { include: { group: true } },
        assembly: true,
      },
    })
    if (!contemplation) throw new NotFoundException(`Contemplação ${id} não encontrada`)
    return contemplation
  }

  async confirmDocumentation(id: string) {
    const contemplation = await this.findOne(id)
    if (contemplation.status !== ContemplationStatus.AWAITING_DOCUMENTATION) {
      throw new ConflictException('Contemplação não está aguardando documentação')
    }
    return this.prisma.contemplation.update({
      where: { id },
      data: { status: ContemplationStatus.CONTEMPLATED_DRAW },
    })
  }

  async releaseCredit(id: string) {
    const contemplation = await this.findOne(id)
    if (
      contemplation.status !== ContemplationStatus.CONTEMPLATED_DRAW &&
      contemplation.status !== ContemplationStatus.CONTEMPLATED_BID
    ) {
      throw new ConflictException('Documentação deve ser confirmada antes de liberar o crédito')
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contemplation.update({
        where: { id },
        data: { status: ContemplationStatus.CREDIT_RELEASED },
      })
      await tx.quota.update({
        where: { id: contemplation.quotaId },
        data: { contemplationStatus: ContemplationStatus.CREDIT_RELEASED },
      })
      return updated
    })
  }
}
