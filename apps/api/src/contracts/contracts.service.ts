import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { ContractStatus } from '@prisma/client'

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async create(quotaId: string, customerId: string, operatorId: string) {
    const [quota, customer] = await Promise.all([
      this.prisma.quota.findUnique({ where: { id: quotaId }, include: { group: true } }),
      this.prisma.customer.findUnique({ where: { id: customerId } }),
    ])
    if (!quota) throw new NotFoundException('Cota não encontrada')
    if (!customer) throw new NotFoundException('Cliente não encontrado')

    const existing = await this.prisma.contract.findFirst({
      where: { quotaId, status: { in: [ContractStatus.DRAFT, ContractStatus.PENDING_SIGNATURE, ContractStatus.ACTIVE] } },
    })
    if (existing) throw new ConflictException('Já existe contrato ativo para esta cota')

    const number = await this.generateContractNumber()

    return this.prisma.contract.create({
      data: {
        number,
        quotaId,
        customerId,
        status: ContractStatus.DRAFT,
        creditAmount: quota.group.creditAmount,
        termMonths: quota.group.termMonths,
        adminFeeRate: quota.group.adminFeeRate,
        reserveFundRate: quota.group.reserveFundRate,
        insuranceRate: quota.group.insuranceRate,
        templateVersion: '1.0',
        adjustmentIndex: 'IGPM',
      },
      include: { quota: true, customer: { select: { fullName: true, taxIdMasked: true } } },
    })
  }

  async findAll(params: { customerId?: string; quotaId?: string; status?: ContractStatus; page?: number; limit?: number }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.customerId) where.customerId = params.customerId
    if (params.quotaId) where.quotaId = params.quotaId
    if (params.status) where.status = params.status

    const [total, data] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, taxIdMasked: true } },
          quota: { select: { quotaNumber: true, group: { select: { code: true, name: true } } } },
        },
      }),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        quota: { include: { group: true } },
      },
    })
    if (!contract) throw new NotFoundException(`Contrato ${id} não encontrado`)
    return contract
  }

  async sign(id: string, _signerUserId: string) {
    const contract = await this.findOne(id)
    if (contract.status !== ContractStatus.DRAFT) {
      throw new ConflictException('Apenas contratos em rascunho podem ser enviados para assinatura')
    }
    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.PENDING_SIGNATURE,
        signedAt: new Date(),
      },
    })
  }

  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.prisma.contract.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } })
    return `CTR-${year}-${String(count + 1).padStart(6, '0')}`
  }
}
