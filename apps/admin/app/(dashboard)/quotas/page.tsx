'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { quotasApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/shared/badge'
import { Search, Eye } from 'lucide-react'
import Link from 'next/link'

export default function QuotasPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['quotas', search, page],
    queryFn: () =>
      quotasApi.list({ search: search || undefined, page, limit: pageSize }) as Promise<unknown>,
    placeholderData: (prev) => prev,
  })

  const items: Quota[] = (data as { data?: { items: Quota[] } })?.data?.items ??
    (data as { items?: Quota[] })?.items ?? []
  const total: number = (data as { data?: { total: number } })?.data?.total ??
    (data as { total?: number })?.total ?? 0

  const columns = [
    {
      key: 'number',
      header: 'Nº Cota',
      render: (row: Quota) => (
        <span className="font-mono text-xs font-bold">{row.number.toString().padStart(4, '0')}</span>
      ),
    },
    {
      key: 'group',
      header: 'Grupo',
      render: (row: Quota) => row.group?.code ?? '—',
    },
    {
      key: 'customer',
      header: 'Titular',
      render: (row: Quota) =>
        row.customer ? (
          <div>
            <p className="font-medium text-sm">{row.customer.name}</p>
            <p className="text-xs text-gray-400">{row.customer.email}</p>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Não atribuída</span>
        ),
    },
    {
      key: 'creditValue',
      header: 'Crédito',
      render: (row: Quota) => formatCurrency(row.creditValue),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Quota) => <Badge status={row.status} />,
    },
    {
      key: 'contemplationStatus',
      header: 'Contemplação',
      render: (row: Quota) => <Badge status={row.contemplationStatus} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row: Quota) => (
        <Link
          href={`/quotas/${row.id}`}
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cotas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total.toLocaleString('pt-BR')} cotas` : 'Gestão de cotas'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número ou titular..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
        </div>
      </div>

      <DataTable
        data={items as unknown as Record<string, unknown>[]}
        columns={columns as Parameters<typeof DataTable>[0]['columns']}
        isLoading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        keyField="id"
        emptyMessage="Nenhuma cota encontrada."
      />
    </div>
  )
}

interface Quota {
  id: string
  number: number
  creditValue: number
  status: string
  contemplationStatus: string
  group?: { code: string }
  customer?: { name: string; email: string }
}
