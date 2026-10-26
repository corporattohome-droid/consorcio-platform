'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assembliesApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/shared/badge'
import { Plus, Eye, Shuffle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function AssembliesPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['assemblies', page],
    queryFn: () => assembliesApi.list({ page, limit: pageSize }) as Promise<unknown>,
    placeholderData: (prev) => prev,
  })

  const drawMutation = useMutation({
    mutationFn: (id: string) => assembliesApi.executeDraw(id),
    onSuccess: () => {
      toast.success('Sorteio executado. Resultado marcado como DEMONSTRATIVO — sujeito a validação regulatória.')
      queryClient.invalidateQueries({ queryKey: ['assemblies'] })
    },
    onError: (err: unknown) => {
      toast.error(String(err) || 'Erro ao executar sorteio.')
    },
  })

  const items: Assembly[] = (data as { data?: { items: Assembly[] } })?.data?.items ??
    (data as { items?: Assembly[] })?.items ?? []
  const total: number = (data as { data?: { total: number } })?.data?.total ??
    (data as { total?: number })?.total ?? 0

  const columns = [
    {
      key: 'number',
      header: 'Assembleia',
      render: (row: Assembly) => (
        <div>
          <p className="font-medium">Nº {row.number}</p>
          <p className="text-xs text-gray-400">{row.group?.code ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'scheduledAt',
      header: 'Data',
      render: (row: Assembly) => formatDate(row.scheduledAt, 'dd/MM/yyyy HH:mm'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Assembly) => <Badge status={row.status} />,
    },
    {
      key: 'drawCount',
      header: 'Sorteios',
      render: (row: Assembly) => row.draws?.length ?? 0,
    },
    {
      key: 'bidCount',
      header: 'Lances',
      render: (row: Assembly) => row.bids?.length ?? 0,
    },
    {
      key: 'actions',
      header: '',
      render: (row: Assembly) => (
        <div className="flex items-center gap-1">
          {row.status === 'SCHEDULED' && (
            <button
              onClick={() => {
                if (confirm('Executar sorteio? O resultado será marcado como DEMONSTRATIVO até validação regulatória.')) {
                  drawMutation.mutate(row.id)
                }
              }}
              disabled={drawMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" /> Sortear
            </button>
          )}
          <Link
            href={`/assemblies/${row.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand-primary hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Ver
          </Link>
        </div>
      ),
      className: 'w-40',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Assembleias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sorteios, lances e contemplações</p>
        </div>
        <Link
          href="/assemblies/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agendar Assembleia
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
        emptyMessage="Nenhuma assembleia encontrada."
      />
    </div>
  )
}

interface Assembly {
  id: string
  number: number
  status: string
  scheduledAt: string
  group?: { code: string }
  draws?: unknown[]
  bids?: unknown[]
}
