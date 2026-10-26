'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { installmentsApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/shared/badge'
import { AlertTriangle } from 'lucide-react'

export default function InstallmentsPage() {
  const [tab, setTab] = useState<'overdue' | 'all'>('overdue')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['installments', tab, page],
    queryFn: () => installmentsApi.overdue() as Promise<unknown>,
    placeholderData: (prev) => prev,
  })

  const items: Installment[] = (data as { data?: { items: Installment[] } })?.data?.items ??
    (data as { items?: Installment[] })?.items ?? []
  const total: number = (data as { data?: { total: number } })?.data?.total ??
    (data as { total?: number })?.total ?? 0

  const columns = [
    {
      key: 'installmentNumber',
      header: 'Parcela',
      render: (row: Installment) => `#${row.installmentNumber}`,
    },
    {
      key: 'quota',
      header: 'Cota',
      render: (row: Installment) => (
        <div>
          <p className="font-mono text-xs font-bold">{row.quota?.number?.toString().padStart(4, '0') ?? '—'}</p>
          <p className="text-xs text-gray-400">{row.quota?.group?.code}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (row: Installment) => row.quota?.customer?.name ?? '—',
    },
    {
      key: 'totalAmount',
      header: 'Valor',
      render: (row: Installment) => (
        <span className="font-medium">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      render: (row: Installment) => (
        <span className={row.status === 'OVERDUE' ? 'text-danger font-medium' : ''}>
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Installment) => <Badge status={row.status} />,
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Parcelas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Acompanhamento de parcelas e inadimplência</p>
      </div>

      {total > 0 && tab === 'overdue' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{total} parcela{total !== 1 ? 's' : ''} vencida{total !== 1 ? 's' : ''}</strong> requer{total === 1 ? '' : 'em'} atenção.
          </p>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-700">
        {(['overdue', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1) }}
            className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'overdue' ? 'Vencidas' : 'Todas'}
          </button>
        ))}
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
        emptyMessage="Nenhuma parcela vencida. Ótimo!"
      />
    </div>
  )
}

interface Installment {
  id: string
  installmentNumber: number
  totalAmount: number
  dueDate: string
  status: string
  quota?: {
    number: number
    group?: { code: string }
    customer?: { name: string }
  }
}
