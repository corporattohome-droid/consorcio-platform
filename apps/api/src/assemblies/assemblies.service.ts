import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { AssemblyStatus, ContemplationType } from '@prisma/client'
import * as crypto from 'crypto'

@Injectable()
export class AssembliesService {
  private readonly logger = new Logger(AssembliesService.name)

  constructor(private prisma: PrismaService) {}

  async schedule(groupId: string, scheduledAt: Date, assemblyNumber: number, bidCloseTime?: Date) {
    const group = await this.prisma.consortiumGroup.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundException('Grupo não encontrado')

    return this.prisma.assembly.create({
      data: { groupId, assemblyNumber, scheduledAt, bidCloseTime, status: AssemblyStatus.SCHEDULED },
    })
  }

  async findAll(groupId?: string) {
    return this.prisma.assembly.findMany({
      where: groupId ? { groupId } : undefined,
      orderBy: { scheduledAt: 'desc' },
      include: {
        group: { select: { code: true, name: true } },
        _count: { select: { bids: true, contemplations: true } },
      },
    })
  }

  async findOne(id: string) {
    const assembly = await this.prisma.assembly.findUnique({
      where: { id },
      include: {
        group: true,
        bids: { include: { quota: { select: { quotaNumber: true } }, customer: { select: { fullName: true } } }, orderBy: { bidAmount: 'desc' } },
        contemplations: { include: { quota: { select: { quotaNumber: true } }, customer: { select: { fullName: true } } } },
      },
    })
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    return assembly
  }

  async registerBid(assemblyId: string, quotaId: string, customerId: string, bidAmount: number) {
    const assembly = await this.prisma.assembly.findUnique({ where: { id: assemblyId } })
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    if (assembly.status !== AssemblyStatus.SCHEDULED) {
      throw new ConflictException('Lance só pode ser registrado em assembleias agendadas')
    }
    if (assembly.bidCloseTime && new Date() > assembly.bidCloseTime) {
      throw new BadRequestException('Prazo para lances encerrado')
    }

    const quota = await this.prisma.quota.findUnique({ where: { id: quotaId } })
    if (!quota) throw new NotFoundException('Cota não encontrada')
    if (!['ACTIVE', 'RESERVED'].includes(quota.status)) {
      throw new ConflictException('Cota não está elegível para lance')
    }

    const existing = await this.prisma.bid.findFirst({ where: { assemblyId, quotaId } })
    if (existing) {
      return this.prisma.bid.update({ where: { id: existing.id }, data: { bidAmount: bidAmount.toString(), updatedAt: new Date() } })
    }

    return this.prisma.bid.create({ data: { assemblyId, quotaId, customerId, bidAmount: bidAmount.toString() } })
  }

  async executeDraw(assemblyId: string, operatorId: string) {
    const assembly = await this.prisma.assembly.findUnique({
      where: { id: assemblyId },
      include: { group: { include: { quotas: { where: { status: { in: ['ACTIVE', 'RESERVED'] }, contemplationStatus: 'NOT_CONTEMPLATED' } } } } },
    })
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    if (assembly.status !== AssemblyStatus.SCHEDULED) {
      throw new ConflictException('Sorteio só pode ser executado em assembleias agendadas')
    }

    const eligibleQuotas = assembly.group.quotas
    if (eligibleQuotas.length === 0) throw new BadRequestException('Nenhuma cota elegível para sorteio')

    const drawSeed = crypto.randomBytes(32).toString('hex')
    this.logger.log(`Semente criptográfica do sorteio ${assemblyId}: ${drawSeed}`)

    const seedBigInt = BigInt(`0x${drawSeed.slice(0, 16)}`)
    const drawnIndex = Number(seedBigInt % BigInt(eligibleQuotas.length))
    const drawnQuota = eligibleQuotas[drawnIndex]

    const highestBid = await this.prisma.bid.findFirst({
      where: { assemblyId }, orderBy: { bidAmount: 'desc' },
      include: { quota: true },
    })

    return this.prisma.$transaction(async (tx) => {
      const contemplations = []

      const drawContemplation = await tx.contemplation.create({
        data: {
          assemblyId,
          quotaId: drawnQuota.id,
          customerId: drawnQuota.contracts?.[0]?.customerId ?? null,
          type: ContemplationType.DRAW,
          creditValue: drawnQuota.creditValue,
          status: 'PENDING_DOCUMENTS',
          notes: `DEMONSTRATIVO — sorteio requer homologação regulatória. Semente: ${drawSeed.slice(0, 8)}...`,
        },
      })
      contemplations.push(drawContemplation)

      await tx.quota.update({
        where: { id: drawnQuota.id },
        data: { contemplationStatus: 'CONTEMPLATED_DRAW' },
      })

      if (highestBid && highestBid.quotaId !== drawnQuota.id) {
        const bidContemplation = await tx.contemplation.create({
          data: {
            assemblyId,
            quotaId: highestBid.quotaId,
            customerId: highestBid.customerId,
            type: ContemplationType.BID,
            creditValue: highestBid.quota.creditValue,
            status: 'PENDING_DOCUMENTS',
            notes: `DEMONSTRATIVO — lance de R$ ${highestBid.bidAmount}. Requer homologação.`,
          },
        })
        contemplations.push(bidContemplation)

        await tx.quota.update({
          where: { id: highestBid.quotaId },
          data: { contemplationStatus: 'CONTEMPLATED_BID' },
        })
      }

      await tx.assembly.update({
        where: { id: assemblyId },
        data: { status: AssemblyStatus.COMPLETED, executedAt: new Date(), drawSeed, executedByUserId: operatorId },
      })

      return { assemblyId, drawSeed: drawSeed.slice(0, 8) + '...', contemplations, isDemonstrative: true }
    })
  }
}
