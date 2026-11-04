import { Test, TestingModule } from '@nestjs/testing'
import { InstallmentsService } from './installments.service'
import { PrismaService } from '../shared/prisma/prisma.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'

const InstallmentStatus = { PENDING: 'PENDING', PAID: 'PAID' } as const

const mockGroup = {
  id: 'group1',
  code: 'GRP-001',
  creditAmount: '50000',
  termMonths: 60,
  adminFeeRate: '20',
  reserveFundRate: '2',
  insuranceRate: '1',
}

const mockPrisma = {
  quota: {
    findUnique: jest.fn(),
  },
  installment: {
    count: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('InstallmentsService', () => {
  let service: InstallmentsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<InstallmentsService>(InstallmentsService)
    jest.clearAllMocks()
  })

  // ── generateSchedule ──────────────────────────────────────────────────────

  describe('generateSchedule', () => {
    it('deve rejeitar geração de cronograma duplicado', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ id: 'q1', group: mockGroup })
      mockPrisma.installment.count.mockResolvedValue(60)
      await expect(service.generateSchedule('q1', new Date('2024-01-01'))).rejects.toThrow(BadRequestException)
    })

    it('deve lançar NotFoundException para cota inexistente', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue(null)
      await expect(service.generateSchedule('nao-existe', new Date())).rejects.toThrow(NotFoundException)
    })

    it('deve gerar exatamente termMonths parcelas', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ id: 'q1', group: mockGroup })
      mockPrisma.installment.count.mockResolvedValue(0)
      mockPrisma.installment.createMany.mockResolvedValue({ count: 60 })
      mockPrisma.installment.findMany.mockResolvedValue(
        Array.from({ length: 60 }, (_, i) => ({ id: `inst${i}`, number: i + 1 }))
      )

      await service.generateSchedule('q1', new Date('2024-01-01'))
      const createArg = mockPrisma.installment.createMany.mock.calls[0][0].data
      expect(createArg).toHaveLength(60)
    })

    it('deve criar parcelas com status PENDING', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ id: 'q1', group: mockGroup })
      mockPrisma.installment.count.mockResolvedValue(0)
      mockPrisma.installment.createMany.mockResolvedValue({ count: 60 })
      mockPrisma.installment.findMany.mockResolvedValue([])

      await service.generateSchedule('q1', new Date('2024-01-01'))
      const installments = mockPrisma.installment.createMany.mock.calls[0][0].data
      expect(installments.every((i: any) => i.status === InstallmentStatus.PENDING)).toBe(true)
    })
  })

  // ── applyAdjustment ───────────────────────────────────────────────────────

  describe('applyAdjustment', () => {
    it('deve rejeitar ajuste maior que 30%', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ id: 'q1' })
      await expect(service.applyAdjustment('q1', 'IGPM', 31, 'op1')).rejects.toThrow(BadRequestException)
    })

    it('deve rejeitar ajuste menor que -30%', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ id: 'q1' })
      await expect(service.applyAdjustment('q1', 'deflação', -31, 'op1')).rejects.toThrow(BadRequestException)
    })

    it('deve lançar NotFoundException para cota inexistente', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue(null)
      await expect(service.applyAdjustment('nao-existe', 'IGPM', 10, 'op1')).rejects.toThrow(NotFoundException)
    })

    it('deve aplicar ajuste positivo às parcelas pendentes', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ id: 'q1' })

      const pendingInst = [
        { id: 'inst1', totalAmount: '500.00', adminFee: '100.00', status: InstallmentStatus.PENDING },
      ]
      const updateMock = jest.fn().mockResolvedValue({})
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          installment: {
            findMany: jest.fn().mockResolvedValue(pendingInst),
            update: updateMock,
          },
        }
        return fn(tx)
      })

      const result = await service.applyAdjustment('q1', 'IGPM', 10, 'op1')
      expect(result.updated).toBe(1)
      expect(result.percentChange).toBe(10)

      const updateArg = updateMock.mock.calls[0][0].data
      expect(parseFloat(updateArg.totalAmount)).toBeCloseTo(550, 1)
    })
  })
})
