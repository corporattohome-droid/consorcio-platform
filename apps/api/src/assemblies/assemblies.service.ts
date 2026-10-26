import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { AssemblyStatus, BidType, ContemplationStatus, QuotaStatus } from '@prisma/client'
import Decimal from 'decimal.js'
import * as crypto from 'crypto'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

@Injectable()
export class AssembliesService {
  private readonly logger = new Logger(AssembliesService.name)

  constructor(private prisma: PrismaService) {}

  async schedule(groupId: string, scheduledDate: Date, number: number, bidCloseAt?: Date) {
    const group = await this.prisma.consortiumGroup.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundException('Grupo não encontrado')
    const existing = await this.prisma.assembly.findFirst({ where: { groupId, number } })
    if (existing) throw new ConflictException(`Assembleia ${number} já existe para este grupo`)
    return this.prisma.assembly.create({
      data: { groupId, number, scheduledDate, bidCloseAt, status: AssemblyStatus.SCHEDULED },
    })
  }

  async findAll(groupId?: string) {
    return this.prisma.assembly.findMany({
      where: groupId ? { groupId } : undefined,
      orderBy: { scheduledDate: 'desc' },
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
        bids: {
          include: { quota: { select: { quotaNumber: true } } },
          orderBy: { amount: 'desc' },
        },
        contemplations: { include: { quota: { select: { quotaNumber: true } } } },
      },
    })
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    return assembly
  }

  async registerBid(assemblyId: string, quotaId: string, bidAmount: number) {
    const [assembly, quota] = await Promise.all([
      this.prisma.assembly.findUnique({ where: { id: assemblyId } }),
      this.prisma.quota.findUnique({
        where: { id: quotaId },
        include: { group: { select: { creditAmount: true } } },
      }),
    ])
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    if (!quota) throw new NotFoundException('Cota não encontrada')
    if (assembly.status !== AssemblyStatus.SCHEDULED) {
      throw new ConflictException('Lance só pode ser registrado em assembleias agendadas')
    }
    if (assembly.bidCloseAt && new Date() > assembly.bidCloseAt) {
      throw new BadRequestException('Prazo para lances encerrado')
    }
    if (quota.status !== QuotaStatus.ACTIVE && quota.status !== QuotaStatus.RESERVED) {
      throw new ConflictException('Cota não está elegível para lance')
    }

    const creditAmount = new Decimal(quota.group.creditAmount.toString())
    const amount = new Decimal(bidAmount)
    const amountPct = amount.div(creditAmount).mul(100).toDecimalPlaces(4)

    const existing = await this.prisma.bid.findFirst({ where: { assemblyId, quotaId } })
    if (existing) {
      return this.prisma.bid.update({
        where: { id: existing.id },
        data: { amount: amount.toString(), amountPct: amountPct.toString() },
      })
    }
    return this.prisma.bid.create({
      data: {
        assemblyId,
        quotaId,
        type: BidType.FREE,
        amount: amount.toString(),
        amountPct: amountPct.toString(),
      },
    })
  }

  async executeDraw(assemblyId: string, _operatorId: string) {
    const assembly = await this.prisma.assembly.findUnique({
      where: { id: assemblyId },
      include: {
        group: {
          include: {
            quotas: {
              where: {
                status: { in: [QuotaStatus.ACTIVE, QuotaStatus.RESERVED] },
                contemplationStatus: ContemplationStatus.NOT_CONTEMPLATED,
              },
            },
          },
        },
      },
    })
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    if (assembly.status !== AssemblyStatus.SCHEDULED) {
      throw new ConflictException('Sorteio só pode ser executado em assembleias agendadas')
    }

    const eligibleQuotas = assembly.group.quotas
    if (eligibleQuotas.length === 0) throw new BadRequestException('Nenhuma cota elegível para sorteio')

    const drawSeed = crypto.randomBytes(32).toString('hex')
    this.logger.log(`Semente criptográfica do sorteio ${assemblyId}: ${drawSeed.slice(0, 8)}...`)

    const seedBigInt = BigInt(`0x${drawSeed.slice(0, 16)}`)
    const drawnIndex = Number(seedBigInt % BigInt(eligibleQuotas.length))
    const drawnQuota = eligibleQuotas[drawnIndex]

    const groupCreditAmount = assembly.group.creditAmount

    const highestBid = await this.prisma.bid.findFirst({
      where: { assemblyId },
      orderBy: { amount: 'desc' },
    })

    return this.prisma.$transaction(async (tx) => {
      const contemplations: any[] = []

      const drawContemplation = await tx.contemplation.create({
        data: {
          assemblyId,
          quotaId: drawnQuota.id,
          type: 'DRAW',
          creditAmount: groupCreditAmount,
          status: ContemplationStatus.AWAITING_DOCUMENTATION,
        },
      })
      contemplations.push(drawContemplation)

      await tx.quota.update({
        where: { id: drawnQuota.id },
        data: { contemplationStatus: ContemplationStatus.CONTEMPLATED_DRAW },
      })

      if (highestBid && highestBid.quotaId !== drawnQuota.id) {
        const bidContemplation = await tx.contemplation.create({
          data: {
            assemblyId,
            quotaId: highestBid.quotaId,
            bidId: highestBid.id,
            type: 'BID',
            creditAmount: groupCreditAmount,
            status: ContemplationStatus.AWAITING_DOCUMENTATION,
          },
        })
        contemplations.push(bidContemplation)

        await tx.quota.update({
          where: { id: highestBid.quotaId },
          data: { contemplationStatus: ContemplationStatus.CONTEMPLATED_BID },
        })
      }

      await tx.assembly.update({
        where: { id: assemblyId },
        data: { status: AssemblyStatus.COMPLETED, closedAt: new Date() },
      })

      return {
        assemblyId,
        drawSeed: drawSeed.slice(0, 8) + '...',
        contemplations,
        isDemonstrative: true,
      }
    })
  }
}
