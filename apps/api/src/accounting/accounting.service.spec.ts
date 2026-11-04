import { Test, TestingModule } from '@nestjs/testing'
import { AccountingService, CreateJournalEntryDto } from './accounting.service'
import { PrismaService } from '../shared/prisma/prisma.service'
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'

const JournalEntryStatus = { PENDING: 'PENDING', POSTED: 'POSTED', REVERSED: 'REVERSED' } as const
const EntryType = { DEBIT: 'DEBIT', CREDIT: 'CREDIT' } as const

const mockPrisma = {
  journalEntry: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  journalLine: {
    aggregate: jest.fn(),
  },
  ledgerAccount: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}

describe('AccountingService', () => {
  let service: AccountingService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<AccountingService>(AccountingService)
    jest.clearAllMocks()
  })

  // ── createJournalEntry ────────────────────────────────────────────────────

  describe('createJournalEntry', () => {
    it('deve rejeitar lançamento com débitos diferentes dos créditos', async () => {
      const dto: CreateJournalEntryDto = {
        date: '2024-01-15',
        description: 'Desequilibrado',
        lines: [
          { accountId: 'acc1', entryType: EntryType.DEBIT,  amount: 1000 },
          { accountId: 'acc2', entryType: EntryType.CREDIT, amount: 900 },
        ],
      }
      await expect(service.createJournalEntry(dto)).rejects.toThrow(BadRequestException)
      expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled()
    })

    it('deve rejeitar lançamento com menos de 2 linhas', async () => {
      const dto: CreateJournalEntryDto = {
        date: '2024-01-15',
        description: 'Linha única',
        lines: [{ accountId: 'acc1', entryType: EntryType.DEBIT, amount: 500 }],
      }
      await expect(service.createJournalEntry(dto)).rejects.toThrow(BadRequestException)
    })

    it('deve rejeitar desequilíbrio decimal (R$ 0,01)', async () => {
      const dto: CreateJournalEntryDto = {
        date: '2024-01-15',
        description: 'Teste decimal',
        lines: [
          { accountId: 'acc1', entryType: EntryType.DEBIT,  amount: 1000.01 },
          { accountId: 'acc2', entryType: EntryType.CREDIT, amount: 1000.00 },
        ],
      }
      await expect(service.createJournalEntry(dto)).rejects.toThrow(BadRequestException)
    })

    it('deve criar lançamento com partidas equilibradas e status PENDING', async () => {
      const dto: CreateJournalEntryDto = {
        date: '2024-01-15',
        description: 'Receita de mensalidade',
        lines: [
          { accountId: 'acc1', entryType: EntryType.DEBIT,  amount: 1000 },
          { accountId: 'acc2', entryType: EntryType.CREDIT, amount: 1000 },
        ],
      }
      mockPrisma.journalEntry.count.mockResolvedValue(5)
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'entry1',
        number: 'LCT-2024-000006',
        status: JournalEntryStatus.PENDING,
        lines: [],
      })
      const result = await service.createJournalEntry(dto)
      expect(result.status).toBe(JournalEntryStatus.PENDING)
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledTimes(1)
      const createArg = mockPrisma.journalEntry.create.mock.calls[0][0].data
      expect(createArg.status).toBe(JournalEntryStatus.PENDING)
    })

    it('deve aceitar múltiplos débitos e créditos equilibrados', async () => {
      const dto: CreateJournalEntryDto = {
        date: '2024-02-01',
        description: 'Rateio de fundo de reserva',
        lines: [
          { accountId: 'a1', entryType: EntryType.DEBIT,  amount: 300 },
          { accountId: 'a2', entryType: EntryType.DEBIT,  amount: 200 },
          { accountId: 'a3', entryType: EntryType.CREDIT, amount: 500 },
        ],
      }
      mockPrisma.journalEntry.count.mockResolvedValue(0)
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'entry2',
        number: 'LCT-2024-000001',
        status: JournalEntryStatus.PENDING,
        lines: [],
      })
      const result = await service.createJournalEntry(dto)
      expect(result).toBeDefined()
    })
  })

  // ── postJournalEntry ──────────────────────────────────────────────────────

  describe('postJournalEntry', () => {
    it('deve postar lançamento pendente', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.PENDING,
      })
      mockPrisma.journalEntry.update.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.POSTED,
      })
      const result = await service.postJournalEntry('entry1', 'user1')
      expect(result.status).toBe(JournalEntryStatus.POSTED)
    })

    it('deve rejeitar postagem de lançamento já postado', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.POSTED,
      })
      await expect(service.postJournalEntry('entry1')).rejects.toThrow(ConflictException)
    })

    it('deve lançar NotFoundException para id inexistente', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(null)
      await expect(service.postJournalEntry('nao-existe')).rejects.toThrow(NotFoundException)
    })

    it('deve funcionar com postedBy omitido (valor padrão system)', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.PENDING,
      })
      mockPrisma.journalEntry.update.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.POSTED,
      })
      await service.postJournalEntry('entry1')
      const updateArg = mockPrisma.journalEntry.update.mock.calls[0][0].data
      expect(updateArg.postedBy).toBe('system')
    })
  })

  // ── reverseJournalEntry ───────────────────────────────────────────────────

  describe('reverseJournalEntry', () => {
    it('deve inverter débitos e créditos no estorno', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.POSTED,
        description: 'Original',
        groupId: null,
        lines: [
          { accountId: 'acc1', entryType: EntryType.DEBIT,  amount: '1000', description: null },
          { accountId: 'acc2', entryType: EntryType.CREDIT, amount: '1000', description: null },
        ],
      })
      mockPrisma.journalEntry.count.mockResolvedValue(10)
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'entry2', status: JournalEntryStatus.POSTED })
      mockPrisma.journalEntry.update.mockResolvedValue({})

      await service.reverseJournalEntry('entry1', 'user1')

      const createArg = mockPrisma.journalEntry.create.mock.calls[0][0].data
      const lines = createArg.lines.create as Array<{ entryType: string }>
      expect(lines[0].entryType).toBe(EntryType.CREDIT)
      expect(lines[1].entryType).toBe(EntryType.DEBIT)
    })

    it('deve rejeitar estorno de lançamento não-postado', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.PENDING,
        lines: [],
      })
      await expect(service.reverseJournalEntry('entry1')).rejects.toThrow(ConflictException)
    })

    it('deve marcar o original como REVERSED', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        id: 'entry1',
        status: JournalEntryStatus.POSTED,
        description: 'Original',
        groupId: null,
        lines: [
          { accountId: 'acc1', entryType: EntryType.DEBIT,  amount: '500', description: null },
          { accountId: 'acc2', entryType: EntryType.CREDIT, amount: '500', description: null },
        ],
      })
      mockPrisma.journalEntry.count.mockResolvedValue(0)
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'entry_rev' })
      mockPrisma.journalEntry.update.mockResolvedValue({})

      await service.reverseJournalEntry('entry1')

      const updateArg = mockPrisma.journalEntry.update.mock.calls[0][0].data
      expect(updateArg.status).toBe(JournalEntryStatus.REVERSED)
    })
  })

  // ── getLedgerAccount ──────────────────────────────────────────────────────

  describe('getLedgerAccount', () => {
    it('deve calcular saldo a partir das linhas postadas', async () => {
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({
        id: 'acc1', code: '1.1.1', name: 'Caixa', accountType: 'ASSET', journalLines: [],
      })
      mockPrisma.journalLine.aggregate
        .mockResolvedValueOnce({ _sum: { amount: '5000' } })
        .mockResolvedValueOnce({ _sum: { amount: '2000' } })

      const result = await service.getLedgerAccount('acc1')
      expect(result.computedBalance).toBe('3000')
    })

    it('deve retornar saldo zero quando não há movimentos', async () => {
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({
        id: 'acc1', code: '1.1.1', name: 'Caixa', accountType: 'ASSET', journalLines: [],
      })
      mockPrisma.journalLine.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })

      const result = await service.getLedgerAccount('acc1')
      expect(result.computedBalance).toBe('0')
    })

    it('deve lançar NotFoundException para conta inexistente', async () => {
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue(null)
      await expect(service.getLedgerAccount('nao-existe')).rejects.toThrow(NotFoundException)
    })
  })
})
