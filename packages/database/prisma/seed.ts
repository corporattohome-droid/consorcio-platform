/**
 * SEED DE DEMONSTRAÇÃO — DADOS FICTÍCIOS
 * Gera ambiente de teste com dados realistas para validação do sistema.
 * NUNCA execute em produção — protegido por verificação de NODE_ENV.
 */

import { PrismaClient, UserRole, PersonType, CustomerStatus, GroupStatus, CreditCategory,
         QuotaStatus, ContemplationStatus, ContractStatus, InstallmentStatus,
         ChargeStatus, PaymentMethod, AssemblyStatus, BidType, BidStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

if (process.env.NODE_ENV === 'production') {
  console.error('SEED BLOQUEADO: NODE_ENV=production. Use somente em desenvolvimento.')
  process.exit(1)
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('🌱 Iniciando seed de demonstração...')

  // ─── Limpar dados existentes na ordem correta ────────────────────
  await prisma.$transaction([
    prisma.journalLine.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.paymentAllocation.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.chargeWebhookEvent.deleteMany(),
    prisma.charge.deleteMany(),
    prisma.installment.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.contemplation.deleteMany(),
    prisma.draw.deleteMany(),
    prisma.assembly.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.quotaOwnershipHistory.deleteMany(),
    prisma.quota.deleteMany(),
    prisma.consortiumGroup.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.customerDocument.deleteMany(),
    prisma.bankAccount.deleteMany(),
    prisma.address.deleteMany(),
    prisma.kycCheck.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.user.deleteMany(),
    prisma.ledgerAccount.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
  ])

  console.log('  ✓ Banco limpo')

  // ─── Usuários administrativos ────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@consorcio.demo',
      passwordHash: await hashPassword('Admin@123456'),
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'gerente@consorcio.demo',
      passwordHash: await hashPassword('Gerente@123456'),
      role: UserRole.MANAGER,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  const cashier = await prisma.user.create({
    data: {
      email: 'caixa@consorcio.demo',
      passwordHash: await hashPassword('Caixa@123456'),
      role: UserRole.CASHIER,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  })

  console.log('  ✓ Usuários administrativos criados (3)')

  // ─── Planos ──────────────────────────────────────────────────────
  const planImovel = await prisma.plan.create({
    data: {
      name: 'Consórcio Imóvel Premium',
      description: 'Plano para aquisição de imóvel residencial ou comercial',
      creditCategory: CreditCategory.REAL_ESTATE,
      creditAmountMin: 100000,
      creditAmountMax: 1000000,
      termMonthsMin: 120,
      termMonthsMax: 240,
      adminFeeRate: 0.015,
      reserveFundRate: 0.005,
      insuranceRate: 0.002,
      adjustmentIndex: 'INCC',
    },
  })

  const planVeiculo = await prisma.plan.create({
    data: {
      name: 'Consórcio Veículos',
      description: 'Plano para aquisição de veículos novos e seminovos',
      creditCategory: CreditCategory.VEHICLE,
      creditAmountMin: 30000,
      creditAmountMax: 300000,
      termMonthsMin: 60,
      termMonthsMax: 120,
      adminFeeRate: 0.018,
      reserveFundRate: 0.005,
      insuranceRate: 0.003,
      adjustmentIndex: 'IPCA',
    },
  })

  console.log('  ✓ Planos criados (2)')

  // ─── Grupos de Consórcio ─────────────────────────────────────────
  const grupo1 = await prisma.consortiumGroup.create({
    data: {
      code: 'GRP-2024-001',
      planId: planImovel.id,
      name: 'Grupo Imóvel Premium — 2024/1',
      creditAmount: 200000,
      totalQuotas: 40,
      soldQuotas: 35,
      termMonths: 180,
      adminFeeRate: 0.015,
      reserveFundRate: 0.005,
      insuranceRate: 0.002,
      adjustmentIndex: 'INCC',
      firstAssemblyDate: new Date('2024-02-15'),
      assemblyDay: 15,
      status: GroupStatus.ACTIVE,
      commonFundBalance: 2150000,
      reserveFundBalance: 120000,
      adminFundBalance: 180000,
    },
  })

  const grupo2 = await prisma.consortiumGroup.create({
    data: {
      code: 'GRP-2024-002',
      planId: planVeiculo.id,
      name: 'Grupo Veículos 2024/1',
      creditAmount: 80000,
      totalQuotas: 30,
      soldQuotas: 28,
      termMonths: 84,
      adminFeeRate: 0.018,
      reserveFundRate: 0.005,
      insuranceRate: 0.003,
      adjustmentIndex: 'IPCA',
      firstAssemblyDate: new Date('2024-03-10'),
      assemblyDay: 10,
      status: GroupStatus.ACTIVE,
      commonFundBalance: 890000,
      reserveFundBalance: 52000,
      adminFundBalance: 75000,
    },
  })

  const grupo3 = await prisma.consortiumGroup.create({
    data: {
      code: 'GRP-2024-003',
      planId: planImovel.id,
      name: 'Grupo Imóvel Compacto 2024/2',
      creditAmount: 120000,
      totalQuotas: 20,
      soldQuotas: 12,
      termMonths: 120,
      adminFeeRate: 0.015,
      reserveFundRate: 0.005,
      insuranceRate: 0.002,
      adjustmentIndex: 'INCC',
      firstAssemblyDate: new Date('2024-05-20'),
      assemblyDay: 20,
      status: GroupStatus.OPEN_FOR_ENROLLMENT,
      commonFundBalance: 450000,
      reserveFundBalance: 28000,
      adminFundBalance: 38000,
    },
  })

  const grupo4 = await prisma.consortiumGroup.create({
    data: {
      code: 'GRP-2023-001',
      planId: planVeiculo.id,
      name: 'Grupo Veículos 2023/1',
      creditAmount: 60000,
      totalQuotas: 30,
      soldQuotas: 30,
      termMonths: 60,
      adminFeeRate: 0.018,
      reserveFundRate: 0.005,
      insuranceRate: 0.003,
      adjustmentIndex: 'IPCA',
      firstAssemblyDate: new Date('2023-01-10'),
      assemblyDay: 10,
      status: GroupStatus.ACTIVE,
      commonFundBalance: 720000,
      reserveFundBalance: 45000,
      adminFundBalance: 62000,
    },
  })

  console.log('  ✓ Grupos criados (4)')

  // ─── 30 Clientes fictícios ───────────────────────────────────────
  const clientesData = [
    { name: 'Maria Aparecida Santos', taxId: '***123456**', email: 'maria.santos@email.demo' },
    { name: 'João Carlos Oliveira', taxId: '***234567**', email: 'joao.oliveira@email.demo' },
    { name: 'Ana Paula Ferreira', taxId: '***345678**', email: 'ana.ferreira@email.demo' },
    { name: 'Carlos Eduardo Lima', taxId: '***456789**', email: 'carlos.lima@email.demo' },
    { name: 'Fernanda Costa Pereira', taxId: '***567890**', email: 'fernanda.pereira@email.demo' },
    { name: 'Roberto Alves Rodrigues', taxId: '***678901**', email: 'roberto.rodrigues@email.demo' },
    { name: 'Juliana Martins', taxId: '***789012**', email: 'juliana.martins@email.demo' },
    { name: 'Marcelo Souza Neto', taxId: '***890123**', email: 'marcelo.souza@email.demo' },
    { name: 'Patricia Barbosa', taxId: '***901234**', email: 'patricia.barbosa@email.demo' },
    { name: 'Anderson Ribeiro', taxId: '***012345**', email: 'anderson.ribeiro@email.demo' },
    { name: 'Camila Nascimento', taxId: '***111222**', email: 'camila.nascimento@email.demo' },
    { name: 'Lucas Carvalho', taxId: '***222333**', email: 'lucas.carvalho@email.demo' },
    { name: 'Vanessa Gomes', taxId: '***333444**', email: 'vanessa.gomes@email.demo' },
    { name: 'Diego Mendes', taxId: '***444555**', email: 'diego.mendes@email.demo' },
    { name: 'Aline Freitas', taxId: '***555666**', email: 'aline.freitas@email.demo' },
    { name: 'Felipe Araújo', taxId: '***666777**', email: 'felipe.araujo@email.demo' },
    { name: 'Renata Cardoso', taxId: '***777888**', email: 'renata.cardoso@email.demo' },
    { name: 'Eduardo Teixeira', taxId: '***888999**', email: 'eduardo.teixeira@email.demo' },
    { name: 'Simone Monteiro', taxId: '***999000**', email: 'simone.monteiro@email.demo' },
    { name: 'Gustavo Rocha', taxId: '***101010**', email: 'gustavo.rocha@email.demo' },
    { name: 'Construtora Alpha Ltda', taxId: '**123456***', email: 'financeiro@alphaconstrutora.demo', isPJ: true },
    { name: 'Transportes Beta S.A.', taxId: '**234567***', email: 'admin@transportesbeta.demo', isPJ: true },
    { name: 'Beatriz Cunha', taxId: '***202020**', email: 'beatriz.cunha@email.demo' },
    { name: 'Rafael Borges', taxId: '***303030**', email: 'rafael.borges@email.demo' },
    { name: 'Claudia Pinto', taxId: '***404040**', email: 'claudia.pinto@email.demo' },
    { name: 'Thiago Vieira', taxId: '***505050**', email: 'thiago.vieira@email.demo' },
    { name: 'Priscila Azevedo', taxId: '***606060**', email: 'priscila.azevedo@email.demo' },
    { name: 'Alexandre Campos', taxId: '***707070**', email: 'alexandre.campos@email.demo' },
    { name: 'Sandra Lopes', taxId: '***808080**', email: 'sandra.lopes@email.demo' },
    { name: 'Henrique Dias', taxId: '***909090**', email: 'henrique.dias@email.demo' },
  ]

  const customers = []
  for (let i = 0; i < clientesData.length; i++) {
    const data = clientesData[i]
    const isPJ = (data as any).isPJ === true
    const customer = await prisma.customer.create({
      data: {
        personType: isPJ ? PersonType.COMPANY : PersonType.INDIVIDUAL,
        fullName: data.name,
        taxId: data.taxId,
        taxIdMasked: data.taxId,
        email: data.email,
        phone: `(11) 9${String(i).padStart(4, '0')}-${String(i + 1000).padStart(4, '0')}`,
        status: CustomerStatus.ACTIVE,
        kycStatus: i < 20 ? 'APPROVED' : 'PENDING',
        kycApprovedAt: i < 20 ? new Date() : null,
        addresses: {
          create: {
            isPrimary: true,
            label: 'Principal',
            zipCode: '01310-100',
            street: 'Avenida Paulista',
            number: String(100 + i * 10),
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          },
        },
      },
    })

    // Criar usuário cliente para os primeiros 10
    if (i < 10) {
      await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: await hashPassword('Cliente@123456'),
          role: UserRole.CLIENT,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          customerId: customer.id,
        },
      })
    }

    customers.push(customer)
  }

  console.log(`  ✓ Clientes criados (${customers.length})`)

  // ─── Cotas ──────────────────────────────────────────────────────
  const quotas = []

  for (let n = 1; n <= 40; n++) {
    const isSold = n <= 35
    const customerIdx = n <= 30 ? (n - 1) % customers.length : null
    const q = await prisma.quota.create({
      data: {
        quotaNumber: String(n).padStart(3, '0'),
        groupId: grupo1.id,
        status: isSold ? QuotaStatus.ACTIVE : QuotaStatus.AVAILABLE,
        contemplationStatus: n <= 5
          ? ContemplationStatus.CONTEMPLATED_DRAW
          : ContemplationStatus.NOT_CONTEMPLATED,
        currentOwnerId: isSold && customerIdx !== null ? customers[customerIdx].id : null,
      },
    })
    quotas.push(q)
  }

  for (let n = 1; n <= 30; n++) {
    const isSold = n <= 28
    const customerIdx = isSold ? (n + 10) % customers.length : null
    const q = await prisma.quota.create({
      data: {
        quotaNumber: String(n).padStart(3, '0'),
        groupId: grupo2.id,
        status: isSold ? QuotaStatus.ACTIVE : QuotaStatus.AVAILABLE,
        contemplationStatus: n <= 3
          ? ContemplationStatus.CONTEMPLATED_BID
          : ContemplationStatus.NOT_CONTEMPLATED,
        currentOwnerId: isSold && customerIdx !== null ? customers[customerIdx].id : null,
      },
    })
    quotas.push(q)
  }

  for (let n = 1; n <= 20; n++) {
    const isSold = n <= 12
    const customerIdx = isSold ? (n + 15) % customers.length : null
    const q = await prisma.quota.create({
      data: {
        quotaNumber: String(n).padStart(3, '0'),
        groupId: grupo3.id,
        status: isSold ? QuotaStatus.ACTIVE : QuotaStatus.AVAILABLE,
        contemplationStatus: ContemplationStatus.NOT_CONTEMPLATED,
        currentOwnerId: isSold && customerIdx !== null ? customers[customerIdx].id : null,
      },
    })
    quotas.push(q)
  }

  for (let n = 1; n <= 30; n++) {
    const customerIdx = (n + 5) % customers.length
    const q = await prisma.quota.create({
      data: {
        quotaNumber: String(n).padStart(3, '0'),
        groupId: grupo4.id,
        status: QuotaStatus.ACTIVE,
        contemplationStatus: n <= 8
          ? ContemplationStatus.CREDIT_RELEASED
          : ContemplationStatus.NOT_CONTEMPLATED,
        currentOwnerId: customers[customerIdx].id,
      },
    })
    quotas.push(q)
  }

  console.log(`  ✓ Cotas criadas (${quotas.length})`)

  // ─── Contratos e Parcelas ────────────────────────────────────────
  let contractSeq = 1
  const activeQuotasGrupo1 = quotas.filter(q => q.groupId === grupo1.id && q.status === QuotaStatus.ACTIVE).slice(0, 20)

  for (const quota of activeQuotasGrupo1) {
    if (!quota.currentOwnerId) continue

    await prisma.contract.create({
      data: {
        number: `CTR-2024-${String(contractSeq).padStart(5, '0')}`,
        quotaId: quota.id,
        customerId: quota.currentOwnerId,
        status: ContractStatus.ACTIVE,
        version: 1,
        templateVersion: 'v1.0',
        creditAmount: 200000,
        termMonths: 180,
        adminFeeRate: 0.015,
        reserveFundRate: 0.005,
        insuranceRate: 0.002,
        adjustmentIndex: 'INCC',
        signedAt: new Date('2024-01-15'),
        signatureMethod: 'DIGITAL',
      },
    })
    contractSeq++

    const installmentAmount = 200000 / 180
    const commonFund = installmentAmount * 0.977
    const adminFee = installmentAmount * 0.015
    const reserveFund = installmentAmount * 0.005
    const insurance = installmentAmount * 0.003

    for (let month = 1; month <= 12; month++) {
      const dueDate = new Date('2024-01-15')
      dueDate.setMonth(dueDate.getMonth() + month - 1)

      const isPaid = month <= 8
      const isOverdue = !isPaid && month <= 10

      await prisma.installment.create({
        data: {
          quotaId: quota.id,
          number: month,
          dueDate,
          status: isPaid
            ? InstallmentStatus.PAID
            : (isOverdue ? InstallmentStatus.OVERDUE : InstallmentStatus.PENDING),
          totalAmount: installmentAmount,
          commonFund,
          adminFee,
          reserveFund,
          insurance,
          paidAmount: isPaid ? installmentAmount : 0,
          paidAt: isPaid ? new Date(dueDate.getTime() + 86400000) : null,
        },
      })
    }
  }

  console.log('  ✓ Contratos e parcelas criados')

  // ─── Assembleia demonstrativa ────────────────────────────────────
  const assembly1 = await prisma.assembly.create({
    data: {
      groupId: grupo1.id,
      number: 12,
      scheduledDate: new Date('2024-12-15'),
      status: AssemblyStatus.SCHEDULED,
      bidCloseAt: new Date('2024-12-14T18:00:00'),
    },
  })

  const activeSaleQuotas = quotas.filter(q => q.groupId === grupo1.id && q.status === QuotaStatus.ACTIVE).slice(0, 3)
  for (const q of activeSaleQuotas) {
    await prisma.bid.create({
      data: {
        assemblyId: assembly1.id,
        quotaId: q.id,
        type: BidType.FREE,
        amount: 40000 + Math.random() * 20000,
        amountPct: (40000 / 200000) * 100,
        status: BidStatus.REGISTERED,
      },
    })
  }

  console.log('  ✓ Assembleia e lances demonstrativos criados')

  // ─── Plano de contas básico ──────────────────────────────────────
  const accounts = [
    { code: '1', name: 'ATIVO', accountType: 'ASSET' },
    { code: '1.1', name: 'ATIVO CIRCULANTE', accountType: 'ASSET' },
    { code: '1.1.1', name: 'DISPONIBILIDADES', accountType: 'ASSET' },
    { code: '1.1.1.001', name: 'Caixa', accountType: 'ASSET' },
    { code: '1.1.1.002', name: 'Bancos — Fundo Comum', accountType: 'ASSET' },
    { code: '1.1.1.003', name: 'Bancos — Fundo de Reserva', accountType: 'ASSET' },
    { code: '1.1.1.004', name: 'Bancos — Taxa de Administração', accountType: 'ASSET' },
    { code: '2', name: 'PASSIVO', accountType: 'LIABILITY' },
    { code: '2.1', name: 'PASSIVO CIRCULANTE', accountType: 'LIABILITY' },
    { code: '2.1.1', name: 'Recursos dos Consorciados — FC', accountType: 'LIABILITY' },
    { code: '2.1.2', name: 'Recursos dos Consorciados — FR', accountType: 'LIABILITY' },
    { code: '3', name: 'RECEITAS', accountType: 'REVENUE' },
    { code: '3.1', name: 'Receita de Administração', accountType: 'REVENUE' },
    { code: '4', name: 'DESPESAS', accountType: 'EXPENSE' },
    { code: '4.1', name: 'Despesas Operacionais', accountType: 'EXPENSE' },
  ]

  for (const acc of accounts) {
    await prisma.ledgerAccount.create({
      data: { code: acc.code, name: acc.name, accountType: acc.accountType },
    })
  }

  console.log('  ✓ Plano de contas básico criado')

  // ─── Templates de notificação ────────────────────────────────────
  await prisma.notificationTemplate.createMany({
    data: [
      {
        key: 'installment.overdue',
        name: 'Parcela em Atraso',
        subject: 'Sua parcela do consórcio está em atraso',
        bodyHtml: '<p>Prezado(a) {{customerName}}, sua parcela {{installmentNumber}} no valor de R$ {{amount}} venceu em {{dueDate}}.</p>',
        bodyText: 'Prezado(a) {{customerName}}, sua parcela {{installmentNumber}} está em atraso.',
        channel: 'EMAIL',
      },
      {
        key: 'assembly.scheduled',
        name: 'Assembleia Agendada',
        subject: 'Assembleia do seu grupo agendada para {{assemblyDate}}',
        bodyHtml: '<p>A assembleia {{assemblyNumber}} do grupo {{groupName}} está agendada para {{assemblyDate}}.</p>',
        bodyText: 'Assembleia {{assemblyNumber}} do grupo {{groupName}} agendada para {{assemblyDate}}.',
        channel: 'EMAIL',
      },
      {
        key: 'contemplation.result',
        name: 'Resultado de Contemplação',
        subject: 'Parabéns! Você foi contemplado no consórcio',
        bodyHtml: '<p>Prezado(a) {{customerName}}, sua cota {{quotaNumber}} foi contemplada na assembleia {{assemblyNumber}}.</p>',
        bodyText: 'Sua cota {{quotaNumber}} foi contemplada!',
        channel: 'EMAIL',
      },
    ],
  })

  console.log('  ✓ Templates de notificação criados')

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('\n📊 Resumo:')
  console.log(`   Usuários admin: 3 (admin@, gerente@, caixa@)`)
  console.log(`   Clientes: ${customers.length}`)
  console.log(`   Grupos: 4`)
  console.log(`   Cotas: ${quotas.length}`)
  console.log(`   Contratos: ${contractSeq - 1}`)
  console.log(`   Assembleia demonstrativa: 1`)
  console.log('\n🔑 Credenciais de acesso:')
  console.log('   Admin:    admin@consorcio.demo / Admin@123456')
  console.log('   Gerente:  gerente@consorcio.demo / Gerente@123456')
  console.log('   Caixa:    caixa@consorcio.demo / Caixa@123456')
  console.log('   Cliente:  maria.santos@email.demo / Cliente@123456')
  console.log('\n⚠️  DADOS FICTÍCIOS — APENAS PARA DEMONSTRAÇÃO')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
