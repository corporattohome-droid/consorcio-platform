'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/shared/badge'
import { BookOpen, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

export default function AccountingPage() {
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'entries' | 'accounts'>('entries')
  const pageSize = 25

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries', page],
    queryFn: () =>
      api.get('/accounting/journal', { params: { page, limit: pageSize } }) as Promise<unknown>,
    placeholderData: (prev) => prev,
    enabled: tab === 'entries',
  })

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['ledger-accounts'],
    queryFn: () => api.get('/accounting/accounts') as Promise<unknown>,
    enabled: tab === 'accounts',
  })

  const entries: JournalEntry[] =
    (data as { data?: { items: JournalEntry[] } })?.data?.items ??
    (data as { items?: JournalEntry[] })?.items ?? []
  const total: number =
    (data as { data?: { total: number } })?.data?.total ??
    (data as { total?: number })?.total ?? 0

  const accounts: LedgerAccount[] =
    (accountsData as { data?: LedgerAccount[] })?.data ??
    (accountsData as LedgerAccount[]) ?? []

  const entryColumns = [
    {
      key: 'entryDate',
      header: 'Data',
      render: (row: JournalEntry) => formatDate(row.entryDate),
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (row: JournalEntry) => (
        <div className="max-w-xs">
          <p className="font-medium text-sm truncate">{row.description}</p>
          <p className="text-xs text-gray-400 font-mono">{row.reference}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (row: JournalEntry) => <Badge status={row.type} />,
    },
    {
      key: 'lines',
      header: 'Débito / Crédito',
      render: (row: JournalEntry) => {
        const debit = row.lines?.find((l) => l.side === 'DEBIT')
        const credit = row.lines?.find((l) => l.side === 'CREDIT')
        return (
          <div className="text-xs space-y-0.5">
            {debit && (
              <div className="flex items-center gap-1 text-danger">
                <TrendingDown className="w-3 h-3" />
                D: {formatCurrency(debit.amount)} — {debit.account?.code}
              </div>
            )}
            {credit && (
              <div className="flex items-center gap-1 text-success">
                <TrendingUp className="w-3 h-3" />
                C: {formatCurrency(credit.amount)} — {credit.account?.code}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: JournalEntry) => <Badge status={row.status} />,
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-primary" />
          Contabilidade
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Lançamentos contábeis — Partidas dobradas (double-entry)</p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-xs text-blue-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Lançamentos gerados automaticamente pelo sistema. Sujeitos a revisão por contador habilitado
          conforme NBC TG e Resolução BCB. Não substituem escrituração contábil oficial.
        </span>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-700">
        {(['entries', 'accounts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'entries' ? 'Lançamentos' : 'Plano de Contas'}
          </button>
        ))}
      </div>

      {tab === 'entries' && (
        <DataTable
          data={entries as unknown as Record<string, unknown>[]}
          columns={entryColumns as Parameters<typeof DataTable>[0]['columns']}
          isLoading={isLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          keyField="id"
          emptyMessage="Nenhum lançamento encontrado."
        />
      )}

      {tab === 'accounts' && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-neutral-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Conta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-neutral-700">
              {loadingAccounts ? (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400 text-sm">Carregando...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400 text-sm">Nenhuma conta cadastrada.</td></tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-700/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{acc.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      <span style={{ paddingLeft: `${(acc.level - 1) * 16}px` }}>
                        {acc.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={acc.type === 'ASSET' ? 'Ativo' : acc.type === 'LIABILITY' ? 'Passivo' : acc.type === 'EQUITY' ? 'PL' : acc.type === 'REVENUE' ? 'Receita' : 'Despesa'}
                        variant={acc.type === 'ASSET' ? 'blue' : acc.type === 'REVENUE' ? 'green' : acc.type === 'EXPENSE' ? 'red' : 'gray'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sm">
                      {formatCurrency(acc.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface JournalLine {
  side: 'DEBIT' | 'CREDIT'
  amount: number
  account?: { code: string; name: string }
}
interface JournalEntry {
  id: string
  entryDate: string
  description: string
  reference?: string
  type: string
  status: string
  lines?: JournalLine[]
}
interface LedgerAccount {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  level: number
  balance: number
}
