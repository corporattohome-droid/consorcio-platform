import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'

export interface CreateJournalEntryDto {
  description: string
  entryDate: string
  type: string
  reference?: string
  lines: Array<{
    accountId: string
    side: 'DEBIT' | 'CREDIT'
    amount: number
    description?: string
  }>
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async getJournalEntries(params: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 25 } = params
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        skip,
        take: limit,
        orderBy: { entryDate: 'desc' },
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
      this.prisma.journalEntry.count(),
    ])

    return { items, total, page, limit }
  }

  async getJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: { account: true },
        },
      },
    })
    if (!entry) throw new NotFoundException('Journal entry not found')
    return entry
  }

  async createJournalEntry(dto: CreateJournalEntryDto) {
    // Validate double-entry: total debits must equal total credits
    const debitTotal = dto.lines
      .filter((l) => l.side === 'DEBIT')
      .reduce((sum, l) => sum.plus(new Decimal(l.amount)), new Decimal(0))
    const creditTotal = dto.lines
      .filter((l) => l.side === 'CREDIT')
      .reduce((sum, l) => sum.plus(new Decimal(l.amount)), new Decimal(0))

    if (!debitTotal.equals(creditTotal)) {
      throw new BadRequestException(
        `Double-entry imbalance: debits ${debitTotal.toFixed(2)} ≠ credits ${creditTotal.toFixed(2)}`,
      )
    }

    return this.prisma.journalEntry.create({
      data: {
        description: dto.description,
        entryDate: new Date(dto.entryDate),
        type: dto.type,
        reference: dto.reference,
        status: 'DRAFT',
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            side: l.side,
            amount: l.amount,
            description: l.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    })
  }

  async postJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { include: { account: true } } },
    })
    if (!entry) throw new NotFoundException('Journal entry not found')
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(`Entry status ${entry.status} cannot be posted`)
    }

    // Post the entry and update ledger account balances atomically
    return this.prisma.$transaction(async (tx) => {
      for (const line of entry.lines) {
        const account = await tx.ledgerAccount.findUnique({ where: { id: line.accountId } })
        if (!account) throw new NotFoundException(`Account ${line.accountId} not found`)

        // Normal balance logic: ASSET/EXPENSE increase on DEBIT; LIABILITY/EQUITY/REVENUE on CREDIT
        const normalDebitTypes = ['ASSET', 'EXPENSE']
        const isNormalBalance = normalDebitTypes.includes(account.type)
        const amount = new Decimal(String(line.amount))
        const current = new Decimal(String(account.balance))

        let newBalance: Decimal
        if (line.side === 'DEBIT') {
          newBalance = isNormalBalance ? current.plus(amount) : current.minus(amount)
        } else {
          newBalance = isNormalBalance ? current.minus(amount) : current.plus(amount)
        }

        await tx.ledgerAccount.update({
          where: { id: line.accountId },
          data: { balance: newBalance.toDecimalPlaces(2).toNumber() },
        })
      }

      return tx.journalEntry.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
        include: { lines: { include: { account: true } } },
      })
    })
  }

  async getLedgerAccounts() {
    return this.prisma.ledgerAccount.findMany({
      orderBy: { code: 'asc' },
    })
  }

  async getLedgerAccount(id: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id },
      include: {
        lines: {
          include: { entry: true },
          orderBy: { entry: { entryDate: 'desc' } },
          take: 50,
        },
      },
    })
    if (!account) throw new NotFoundException('Ledger account not found')
    return account
  }

  async getTrialBalance() {
    const accounts = await this.prisma.ledgerAccount.findMany({
      orderBy: { code: 'asc' },
    })

    const debitTypes = ['ASSET', 'EXPENSE']
    let totalDebits = new Decimal(0)
    let totalCredits = new Decimal(0)

    const rows = accounts.map((acc) => {
      const balance = new Decimal(String(acc.balance))
      const isDebitNormal = debitTypes.includes(acc.type)
      const debit = isDebitNormal && balance.gt(0) ? balance : new Decimal(0)
      const credit = !isDebitNormal && balance.gt(0) ? balance : new Decimal(0)
      totalDebits = totalDebits.plus(debit)
      totalCredits = totalCredits.plus(credit)
      return { ...acc, debit: debit.toNumber(), credit: credit.toNumber() }
    })

    return {
      rows,
      totalDebits: totalDebits.toNumber(),
      totalCredits: totalCredits.toNumber(),
      balanced: totalDebits.equals(totalCredits),
    }
  }
}
