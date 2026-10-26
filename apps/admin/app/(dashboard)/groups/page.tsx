'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { groupsApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/shared/badge'
import { Plus, Eye } from 'lucide-react'
import Link from 'next/link'

export default function GroupsPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['groups', page],
    queryFn: () => groupsApi.list({ page, limit: pageSize }) as Promise<unknown>,
    placeholderData: (prev) => prev,
  })

  const items: Group[] = (data as { data?: { items: Group[] } })?.data?.items ??
    (data as { items?: Group[] })?.items ?? []
  const total: number = (data as { data?: { total: number } })?.data?.total ??
    (data as { total?: number })?.total ?? 0

  const columns = [
    {
      key: 'code',
      header: 'Código',
      render: (row: Group) => (
        <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
          {row.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nome',
      render: (row: Group) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
          {row.plan && <p className="text-xs text-gray-400">{row.plan.name}</p>}
        </div>
      ),
    },
    {
      key: 'creditValue',
      header: 'Crédito',
      render: (row: Group) => formatCurrency(row.creditValue),
    },
    {
      key: 'quota',
      header: 'Cotas',
      render: (row: Group) => (
        <span className="text-sm">
          {row.filledQuotas ?? 0} / {row.totalQuotas}
        </span>
      ),
    },
    {
      key: 'termMonths',
      header: 'Prazo',
      render: (row: Group) => `${row.termMonths} meses`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Group) => <Badge status={row.status} />,
    },
    {
      key: 'startDate',
      header: 'Início',
      render: (row: Group) => formatDate(row.startDate),
    },
    {
      key: 'actions',
      header: '',
      render: (row: Group) => (
        <Link
          href={`/groups/${row.id}`}
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Grupos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} grupos cadastrados` : 'Gestão de grupos de consórcio'}
          </p>
        </div>
        <Link
          href="/groups/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Grupo
        </Link>
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
        emptyMessage="Nenhum grupo encontrado."
      />
    </div>
  )
}

interface Group {
  id: string
  code: string
  name: string
  creditValue: number
  totalQuotas: number
  filledQuotas?: number
  termMonths: number
  status: string
  startDate?: string
  plan?: { name: string }
}
