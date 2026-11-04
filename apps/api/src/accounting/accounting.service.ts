import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { JournalEntryStatus, EntryType } from '@prisma/client'
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export class CreateJournalEntryDto {
  date: string
  description: string
  groupId?: string
  lines: Array<{
    accountId: string
    entryType: EntryType
    amount: number
    description?: string
  }>
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getJournalEntries(params: {
    groupId?: string
    status?: JournalEntryStatus
    page?: number
    limit?: number
  }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.groupId) where.groupId = params.groupId
    if (params.status) where.status = params.status

    const [total, data] = await Promise.all([
      this.prisma.journalEntry.count({ where }),
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
        },
      }),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async getJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: { select: { code: true, name: true, accountType: true } } } },
      },
    })
    if (!entry) throw new NotFoundException(`Lançamento ${id} não encontrado`)
    return entry
  }

  async createJournalEntry(dto: CreateJournalEntryDto) {
    const debits = dto.lines
      .filter((l) => l.entryType === EntryType.DEBIT)
      .reduce((s, l) => s.plus(new Decimal(l.amount)), new Decimal(0))
    const credits = dto.lines
      .filter((l) => l.entryType === EntryType.CREDIT)
      .reduce((s, l) => s.plus(new Decimal(l.amount)), new Decimal(0))
    if (!debits.equals(credits)) {
      throw new BadRequestException(
        `Partidas devem ser iguais: débitos R$ ${debits.toFixed(2)} ≠ créditos R$ ${credits.toFixed(2)}`,
      )
    }
    if (dto.lines.length < 2) {
      throw new BadRequestException('Um lançamento requer no mínimo duas linhas (partida dobrada)')
    }

    const number = await this.generateEntryNumber()

    return this.prisma.journalEntry.create({
      data: {
        number,
        date: new Date(dto.date),
        description: dto.description,
        groupId: dto.groupId,
        status: JournalEntryStatus.PENDING,
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            entryType: l.entryType,
            amount: new Decimal(l.amount).toDecimalPlaces(2).toString(),
            description: l.description,
          })),
        },
      },
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
      },
    })
  }

  async postJournalEntry(id: string, postedBy?: string) {
    const entry = await this.prisma.journalEntry.findUnique({ where: { id } })
    if (!entry) throw new NotFoundException('Lançamento contábil não encontrado')
    if (entry.status !== JournalEntryStatus.PENDING) {
      throw new ConflictException('Apenas lançamentos pendentes podem ser postados')
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: JournalEntryStatus.POSTED, postedAt: new Date(), postedBy: postedBy ?? 'system' },
    })
  }

  async reverseJournalEntry(id: string, reversedBy?: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (!entry) throw new NotFoundException('Lançamento contábil não encontrado')
    if (entry.status !== JournalEntryStatus.POSTED) {
      throw new ConflictException('Apenas lançamentos postados podem ser estornados')
    }

    const number = await this.generateEntryNumber()
    const reversal = await this.prisma.journalEntry.create({
      data: {
        number,
        date: new Date(),
        description: `ESTORNO: ${entry.description}`,
        groupId: entry.groupId,
        status: JournalEntryStatus.POSTED,
        postedAt: new Date(),
        postedBy: reversedBy ?? 'system',
        lines: {
          create: entry.lines.map((l) => ({
            accountId: l.accountId,
            entryType: l.entryType === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT,
            amount: l.amount.toString(),
            description: l.description,
          })),
        },
      },
    })

    await this.prisma.journalEntry.update({
      where: { id },
      data: { status: JournalEntryStatus.REVERSED, reversedAt: new Date(), reversedBy: reversedBy ?? 'system', reverseRef: reversal.id },
    })

    return reversal
  }

  async getLedgerAccounts(params?: { isActive?: boolean }) {
    return this.prisma.ledgerAccount.findMany({
      where: params?.isActive !== undefined ? { isActive: params.isActive } : undefined,
      orderBy: { code: 'asc' },
      include: {
        children: { select: { id: true, code: true, name: true, accountType: true } },
      },
    })
  }

  async getLedgerAccount(id: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id },
      include: {
        journalLines: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            journalEntry: { select: { number: true, date: true, description: true, status: true } },
          },
        },
      },
    })
    if (!account) throw new NotFoundException(`Conta contábil ${id} não encontrada`)

    const [debitAgg, creditAgg] = await Promise.all([
      this.prisma.journalLine.aggregate({
        where: {
          accountId: id,
          entryType: EntryType.DEBIT,
          journalEntry: { status: JournalEntryStatus.POSTED },
        },
        _sum: { amount: true },
      }),
      this.prisma.journalLine.aggregate({
        where: {
          accountId: id,
          entryType: EntryType.CREDIT,
          journalEntry: { status: JournalEntryStatus.POSTED },
        },
        _sum: { amount: true },
      }),
    ])

    const debits = new Decimal(debitAgg._sum.amount?.toString() ?? '0')
    const credits = new Decimal(creditAgg._sum.amount?.toString() ?? '0')

    return {
      ...account,
      accountType: account.accountType,
      computedBalance: debits.minus(credits).toString(),
    }
  }

  async getTrialBalance() {
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, accountType: true },
      orderBy: { code: 'asc' },
    })

    return Promise.all(
      accounts.map(async (account) => {
        const [debitAgg, creditAgg] = await Promise.all([
          this.prisma.journalLine.aggregate({
            where: {
              accountId: account.id,
              entryType: EntryType.DEBIT,
              journalEntry: { status: JournalEntryStatus.POSTED },
            },
            _sum: { amount: true },
          }),
          this.prisma.journalLine.aggregate({
            where: {
              accountId: account.id,
              entryType: EntryType.CREDIT,
              journalEntry: { status: JournalEntryStatus.POSTED },
            },
            _sum: { amount: true },
          }),
        ])
        const debits = new Decimal(debitAgg._sum.amount?.toString() ?? '0')
        const credits = new Decimal(creditAgg._sum.amount?.toString() ?? '0')
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          debits: debits.toString(),
          credits: credits.toString(),
          balance: debits.minus(credits).toString(),
        }
      }),
    )
  }

  private async generateEntryNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.prisma.journalEntry.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    })
    return `LCT-${year}-${String(count + 1).padStart(6, '0')}`
  }
}
