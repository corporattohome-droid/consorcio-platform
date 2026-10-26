import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../shared/prisma/prisma.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { CustomerStatus } from '@prisma/client'

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { taxId: dto.taxId } })
    if (existing) throw new ConflictException('CPF/CNPJ já cadastrado no sistema')

    return this.prisma.customer.create({
      data: {
        personType: dto.personType,
        fullName: dto.fullName,
        tradeName: dto.tradeName,
        taxId: dto.taxId,
        taxIdMasked: this.maskTaxId(dto.taxId, dto.personType),
        email: dto.email,
        phone: dto.phone,
        phone2: dto.phone2,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        maritalStatus: dto.maritalStatus,
        occupation: dto.occupation,
        status: CustomerStatus.ACTIVE,
        addresses: dto.address ? { create: { isPrimary: true, ...dto.address } } : undefined,
      },
      include: { addresses: true },
    })
  }

  async findAll(params: { page?: number; limit?: number; search?: string; status?: CustomerStatus }) {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit
    const where: any = {}
    if (params.status) where.status = params.status
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { taxIdMasked: { contains: params.search, mode: 'insensitive' } },
      ]
    }
    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where, skip, take: limit, orderBy: { fullName: 'asc' },
        select: {
          id: true, personType: true, fullName: true, taxIdMasked: true,
          email: true, phone: true, status: true, kycStatus: true, createdAt: true,
          _count: { select: { contracts: true } },
        },
      }),
    ])
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        documents: { select: { id: true, type: true, description: true, uploadedAt: true, expiresAt: true } },
        kycChecks: { orderBy: { performedAt: 'desc' }, take: 5 },
        contracts: {
          include: { quota: { select: { quotaNumber: true, group: { select: { name: true, code: true } } } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!customer) throw new NotFoundException(`Cliente ${id} não encontrado`)
    return customer
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id)
    return this.prisma.customer.update({
      where: { id },
      data: { fullName: dto.fullName, tradeName: dto.tradeName, email: dto.email, phone: dto.phone, phone2: dto.phone2, maritalStatus: dto.maritalStatus, occupation: dto.occupation, internalNotes: dto.internalNotes },
    })
  }

  async updateStatus(id: string, status: CustomerStatus) {
    await this.findOne(id)
    return this.prisma.customer.update({ where: { id }, data: { status } })
  }

  private maskTaxId(taxId: string, personType: string): string {
    const digits = taxId.replace(/\D/g, '')
    if (personType === 'INDIVIDUAL' && digits.length === 11)
      return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
    if (personType === 'COMPANY' && digits.length === 14)
      return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/**-**`
    return taxId
  }
}
