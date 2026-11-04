import { Test, TestingModule } from '@nestjs/testing'
import { PaymentsService } from './payments.service'
import { PrismaService } from '../shared/prisma/prisma.service'
import { InstallmentStatus } from '@prisma/client'
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'

const pendingInstallment = {
  id: 'inst1',
  quotaId: 'quota1',
  number: 1,
  totalAmount: '500.00',
  status: InstallmentStatus.PENDING,
}

const mockPrisma = {
  installment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  paymentAllocation: {
    create: jest.fn(),
  },
  chargeWebhookEvent: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  quota: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('PaymentsService', () => {
  let service: PaymentsService
  const originalNodeEnv = process.env.NODE_ENV

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<PaymentsService>(PaymentsService)
    jest.clearAllMocks()
  })

  // ── registerTestPayment ───────────────────────────────────────────────────

  describe('registerTestPayment', () => {
    it('deve bloquear pagamento de teste em ambiente de produção', async () => {
      process.env.NODE_ENV = 'production'
      await expect(service.registerTestPayment('quota1', 500, 'op1')).rejects.toThrow(ForbiddenException)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('deve lançar NotFoundException quando não há parcela pendente', async () => {
      process.env.NODE_ENV = 'test'
      mockPrisma.installment.findFirst.mockResolvedValue(null)
      await expect(service.registerTestPayment('quota1', 500, 'op1')).rejects.toThrow(NotFoundException)
    })

    it('deve rejeitar valor de pagamento menor que o total devido', async () => {
      process.env.NODE_ENV = 'test'
      mockPrisma.installment.findFirst.mockResolvedValue(pendingInstallment)
      await expect(service.registerTestPayment('quota1', 400, 'op1')).rejects.toThrow(BadRequestException)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('deve registrar pagamento com sucesso e alocar para parcela', async () => {
      process.env.NODE_ENV = 'test'
      mockPrisma.installment.findFirst.mockResolvedValue(pendingInstallment)

      const mockPayment = { id: 'pay1', amount: '500.00', status: 'CONFIRMED' }
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          payment: { create: jest.fn().mockResolvedValue(mockPayment) },
          installment: {
            findMany: jest.fn().mockResolvedValue([pendingInstallment]),
            update: jest.fn().mockResolvedValue({ ...pendingInstallment, status: InstallmentStatus.PAID }),
          },
          paymentAllocation: { create: jest.fn().mockResolvedValue({}) },
        }
        return fn(tx)
      })

      const result = await service.registerTestPayment('quota1', 500, 'op1')
      expect(result).toMatchObject({ id: 'pay1', status: 'CONFIRMED' })
    })

    it('deve alocar pagamento excedente para parcelas seguintes', async () => {
      process.env.NODE_ENV = 'test'
      mockPrisma.installment.findFirst.mockResolvedValue(pendingInstallment)

      const installments = [
        { id: 'inst1', totalAmount: '300.00', status: InstallmentStatus.PENDING },
        { id: 'inst2', totalAmount: '300.00', status: InstallmentStatus.PENDING },
      ]
      const mockPayment = { id: 'pay2', amount: '600.00' }
      const createAllocMock = jest.fn().mockResolvedValue({})

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          payment: { create: jest.fn().mockResolvedValue(mockPayment) },
          installment: {
            findMany: jest.fn().mockResolvedValue(installments),
            update: jest.fn().mockResolvedValue({}),
          },
          paymentAllocation: { create: createAllocMock },
        }
        return fn(tx)
      })

      await service.registerTestPayment('quota1', 600, 'op1')
      // Ambas as parcelas devem ter recebido alocação
      expect(createAllocMock).toHaveBeenCalledTimes(2)
    })
  })

  // ── processWebhook ────────────────────────────────────────────────────────

  describe('processWebhook', () => {
    it('deve ignorar webhook duplicado (idempotência)', async () => {
      mockPrisma.chargeWebhookEvent.findUnique.mockResolvedValue({ id: 'evt1', idempotencyKey: 'key1' })
      const result = await service.processWebhook({}, 'key1')
      expect(result.status).toBe('duplicate')
      expect(mockPrisma.chargeWebhookEvent.upsert).not.toHaveBeenCalled()
    })

    it('deve processar novo webhook e retornar status received', async () => {
      mockPrisma.chargeWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.chargeWebhookEvent.upsert.mockResolvedValue({ id: 'evt2' })
      const result = await service.processWebhook({ event: 'payment.confirmed', provider: 'PIX' }, 'key2')
      expect(result.status).toBe('received')
      expect(result.eventId).toBe('evt2')
    })

    it('deve persistir o payload completo no evento de webhook', async () => {
      const payload = { event: 'charge.paid', chargeId: 'chg_123', provider: 'BOLETO', amount: 500 }
      mockPrisma.chargeWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.chargeWebhookEvent.upsert.mockResolvedValue({ id: 'evt3' })

      await service.processWebhook(payload, 'key3')

      const upsertArg = mockPrisma.chargeWebhookEvent.upsert.mock.calls[0][0]
      expect(upsertArg.create.payload).toEqual(payload)
      expect(upsertArg.create.chargeId).toBe('chg_123')
    })
  })
})
