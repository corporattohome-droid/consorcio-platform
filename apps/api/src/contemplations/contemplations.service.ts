import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { Prisma } from '@prisma/client'

export type ContemplationType = 'DRAW' | 'BID'

export interface ContemplateQuotaDto {
  quotaId: string
  assemblyId: string
  type: ContemplationType
  creditValue: number
  notes?: string
}

export interface ReleaseCreditDto {
  contemplationId: string
  scheduledReleaseDate: string
  notes?: string
}

@Injectable()
export class ContemplationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    params: { page?: number; limit?: number; quotaId?: string } = {},
  ) {
    const { page = 1, limit = 20, quotaId } = params
    const skip = (page - 1) * limit

    const where: Prisma.ContemplationWhereInput = quotaId ? { quotaId } : {}

    const [items, total] = await Promise.all([
      this.prisma.contemplation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { contemplationDate: 'desc' },
        include: {
          quota: {
            include: {
              customer: { select: { id: true, name: true, email: true } },
              group: { select: { id: true, code: true, name: true } },
            },
          },
          assembly: { select: { id: true, number: true, scheduledAt: true } },
        },
      }),
      this.prisma.contemplation.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async findOne(id: string) {
    const contemplation = await this.prisma.contemplation.findUnique({
      where: { id },
      include: {
        quota: {
          include: {
            customer: true,
            group: { include: { plan: true } },
          },
        },
        assembly: true,
      },
    })

    if (!contemplation) throw new NotFoundException('Contemplation not found')
    return contemplation
  }

  async contemplateQuota(dto: ContemplateQuotaDto) {
    const quota = await this.prisma.quota.findUnique({
      where: { id: dto.quotaId },
      include: { group: true },
    })
    if (!quota) throw new NotFoundException('Quota not found')
    if (!['ACTIVE', 'SUSPENDED'].includes(quota.status)) {
      throw new BadRequestException(`Quota status ${quota.status} cannot be contemplated`)
    }
    if (quota.contemplationStatus !== 'NOT_CONTEMPLATED') {
      throw new BadRequestException('Quota is already contemplated')
    }

    const assembly = await this.prisma.assembly.findUnique({
      where: { id: dto.assemblyId },
    })
    if (!assembly) throw new NotFoundException('Assembly not found')

    const contemplationStatus =
      dto.type === 'DRAW' ? 'CONTEMPLATED_DRAW' : 'CONTEMPLATED_BID'

    const [contemplation] = await this.prisma.$transaction([
      this.prisma.contemplation.create({
        data: {
          quotaId: dto.quotaId,
          assemblyId: dto.assemblyId,
          type: dto.type,
          contemplationDate: new Date(),
          creditValue: dto.creditValue,
          status: 'PENDING_RELEASE',
          notes: dto.notes,
        },
      }),
      this.prisma.quota.update({
        where: { id: dto.quotaId },
        data: { contemplationStatus },
      }),
    ])

    return contemplation
  }

  async scheduleRelease(dto: ReleaseCreditDto) {
    const contemplation = await this.prisma.contemplation.findUnique({
      where: { id: dto.contemplationId },
    })
    if (!contemplation) throw new NotFoundException('Contemplation not found')
    if (contemplation.status !== 'PENDING_RELEASE') {
      throw new BadRequestException(
        `Contemplation status ${contemplation.status} cannot be scheduled for release`,
      )
    }

    return this.prisma.contemplation.update({
      where: { id: dto.contemplationId },
      data: {
        scheduledReleaseDate: new Date(dto.scheduledReleaseDate),
        status: 'SCHEDULED_RELEASE',
        notes: dto.notes ?? contemplation.notes,
      },
    })
  }

  async releaseCredit(id: string) {
    const contemplation = await this.prisma.contemplation.findUnique({
      where: { id },
      include: { quota: { include: { group: true } } },
    })
    if (!contemplation) throw new NotFoundException('Contemplation not found')
    if (!['PENDING_RELEASE', 'SCHEDULED_RELEASE'].includes(contemplation.status)) {
      throw new BadRequestException(
        `Contemplation status ${contemplation.status} cannot be released`,
      )
    }

    // IMPORTANT: In production this would trigger the actual credit release flow
    // through the regulated financial institution. This is a demonstration stub.
    return this.prisma.contemplation.update({
      where: { id },
      data: {
        status: 'CREDIT_RELEASED',
        releasedAt: new Date(),
      },
    })
  }

  async getStats() {
    const [pending, scheduled, released, total] = await Promise.all([
      this.prisma.contemplation.count({ where: { status: 'PENDING_RELEASE' } }),
      this.prisma.contemplation.count({ where: { status: 'SCHEDULED_RELEASE' } }),
      this.prisma.contemplation.count({ where: { status: 'CREDIT_RELEASED' } }),
      this.prisma.contemplation.count(),
    ])
    return { pending, scheduled, released, total }
  }
}
