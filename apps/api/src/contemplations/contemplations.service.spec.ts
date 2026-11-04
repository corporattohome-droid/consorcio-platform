import { Test, TestingModule } from '@nestjs/testing'
import { ContemplationsService } from './contemplations.service'
import { PrismaService } from '../shared/prisma/prisma.service'
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'

const ContemplationStatus = {
  AWAITING_DOCUMENTATION: 'AWAITING_DOCUMENTATION',
  CONTEMPLATED_DRAW: 'CONTEMPLATED_DRAW',
  CONTEMPLATED_BID: 'CONTEMPLATED_BID',
  CREDIT_RELEASED: 'CREDIT_RELEASED',
} as const

const mockPrisma = {
  contemplation: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

describe('ContemplationsService', () => {
  let service: ContemplationsService
  const originalNodeEnv = process.env.NODE_ENV

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContemplationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<ContemplationsService>(ContemplationsService)
    jest.clearAllMocks()
  })

  // ── confirmDocumentation ──────────────────────────────────────────────────

  describe('confirmDocumentation', () => {
    it('deve transicionar para CONTEMPLATED_DRAW quando tipo é DRAW', async () => {
      mockPrisma.contemplation.findUnique.mockResolvedValue({
        id: 'c1',
        status: ContemplationStatus.AWAITING_DOCUMENTATION,
        type: 'DRAW',
      })
      mockPrisma.contemplation.update.mockResolvedValue({
        id: 'c1',
        status: ContemplationStatus.CONTEMPLATED_DRAW,
      })
      const result = await service.confirmDocumentation('c1')
      expect(result.status).toBe(ContemplationStatus.CONTEMPLATED_DRAW)
    })

    it('deve transicionar para CONTEMPLATED_BID quando tipo é BID', async () => {
      mockPrisma.contemplation.findUnique.mockResolvedValue({
        id: 'c2',
        status: ContemplationStatus.AWAITING_DOCUMENTATION,
        type: 'BID',
      })
      mockPrisma.contemplation.update.mockResolvedValue({
        id: 'c2',
        status: ContemplationStatus.CONTEMPLATED_BID,
      })
      const result = await service.confirmDocumentation('c2')
      expect(result.status).toBe(ContemplationStatus.CONTEMPLATED_BID)
    })

    it('deve rejeitar contemplação que não está aguardando documentação', async () => {
      mockPrisma.contemplation.findUnique.mockResolvedValue({
        id: 'c1',
        status: ContemplationStatus.CREDIT_RELEASED,
        type: 'DRAW',
      })
      await expect(service.confirmDocumentation('c1')).rejects.toThrow(ConflictException)
      expect(mockPrisma.contemplation.update).not.toHaveBeenCalled()
    })

    it('deve lançar NotFoundException para id inexistente', async () => {
      mockPrisma.contemplation.findUnique.mockResolvedValue(null)
      await expect(service.confirmDocumentation('nao-existe')).rejects.toThrow(NotFoundException)
    })
  })

  // ── releaseCredit ─────────────────────────────────────────────────────────

  describe('releaseCredit', () => {
    it('deve bloquear liberação de crédito em produção (Lei 11.795/2008)', async () => {
      process.env.NODE_ENV = 'production'
      await expect(service.releaseCredit('c1')).rejects.toThrow(ForbiddenException)
      expect(mockPrisma.contemplation.findUnique).not.toHaveBeenCalled()
    })

    it('deve liberar crédito em ambiente de teste/desenvolvimento', async () => {
      process.env.NODE_ENV = 'test'
      mockPrisma.contemplation.findUnique.mockResolvedValue({
        id: 'c1',
        status: ContemplationStatus.CONTEMPLATED_DRAW,
      })
      mockPrisma.contemplation.update.mockResolvedValue({
        id: 'c1',
        status: ContemplationStatus.CREDIT_RELEASED,
      })
      const result = await service.releaseCredit('c1')
      expect(result.status).toBe(ContemplationStatus.CREDIT_RELEASED)
    })

    it('deve lançar NotFoundException para contemplação inexistente', async () => {
      process.env.NODE_ENV = 'test'
      mockPrisma.contemplation.findUnique.mockResolvedValue(null)
      await expect(service.releaseCredit('nao-existe')).rejects.toThrow(NotFoundException)
    })
  })

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('deve retornar lista paginada de contemplações', async () => {
      mockPrisma.contemplation.count.mockResolvedValue(3)
      mockPrisma.contemplation.findMany.mockResolvedValue([
        { id: 'c1', status: ContemplationStatus.AWAITING_DOCUMENTATION },
        { id: 'c2', status: ContemplationStatus.CONTEMPLATED_DRAW },
        { id: 'c3', status: ContemplationStatus.CREDIT_RELEASED },
      ])
      const result = await service.findAll({})
      expect(result.data).toHaveLength(3)
      expect(result.meta.total).toBe(3)
    })
  })
})
