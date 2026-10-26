'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/lib/api'
import { formatDate, formatCpf, formatCnpj } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/shared/badge'
import { Search, UserPlus, Eye } from 'lucide-react'
import Link from 'next/link'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () =>
      customersApi.list({ search: search || undefined, page, limit: pageSize }) as Promise<CustomersResponse>,
    placeholderData: (prev) => prev,
  })

  const customers: Customer[] = (data as unknown as { data: { items: Customer[]; total: number } })?.data?.items ??
    (data as unknown as { items: Customer[]; total: number })?.items ?? []
  const total: number = (data as unknown as { data: { total: number } })?.data?.total ??
    (data as unknown as { total: number })?.total ?? 0

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (row: Customer) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
          <p className="text-xs text-gray-400">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'taxId',
      header: 'CPF / CNPJ',
      render: (row: Customer) => (
        <span className="font-mono text-xs">
          {row.personType === 'INDIVIDUAL'
            ? formatCpf(row.taxId)
            : formatCnpj(row.taxId)}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (row: Customer) => row.phone ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Customer) => <Badge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Cadastrado em',
      render: (row: Customer) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row: Customer) => (
        <Link
          href={`/customers/${row.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand-primary hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Ver
        </Link>
      ),
      className: 'w-16',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total.toLocaleString('pt-BR')} clientes cadastrados` : 'Gerenciamento de clientes'}
          </p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Cliente
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
        </div>
      </div>

      <DataTable
        data={customers as unknown as Record<string, unknown>[]}
        columns={columns as Parameters<typeof DataTable>[0]['columns']}
        isLoading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        keyField="id"
        emptyMessage="Nenhum cliente encontrado."
      />
    </div>
  )
}

interface Customer {
  id: string
  name: string
  email: string
  taxId: string
  personType: 'INDIVIDUAL' | 'COMPANY'
  phone?: string
  status: string
  createdAt: string
}
type CustomersResponse = unknown
