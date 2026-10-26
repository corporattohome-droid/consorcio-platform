'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/shared/badge'
import {
  Users, Building2, CreditCard, DollarSign, AlertTriangle,
  CheckCircle, TrendingUp, Calendar, RefreshCw
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'

const CHART_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2']

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-gray-200 rounded-xl" />
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => dashboardApi.getAdminSummary() as Promise<{ data: AdminDashboard }>,
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-12 h-12 text-danger" />
        <p className="text-gray-600 dark:text-gray-400">Erro ao carregar dados do painel.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-dark transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    )
  }

  const summary = data?.data ?? (data as unknown as AdminDashboard)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Visão geral da plataforma · Atualizado em {formatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Clientes"
          value={summary?.totalCustomers?.toLocaleString('pt-BR') ?? '—'}
          icon={Users}
          iconColor="text-brand-primary"
          change={summary?.customersGrowthPercent}
          changeLabel="vs mês anterior"
        />
        <StatCard
          title="Grupos Ativos"
          value={summary?.activeGroups?.toLocaleString('pt-BR') ?? '—'}
          icon={Building2}
          iconColor="text-purple-600"
        />
        <StatCard
          title="Volume de Crédito"
          value={formatCurrency(summary?.totalCreditVolume)}
          icon={CreditCard}
          iconColor="text-brand-primary"
        />
        <StatCard
          title="Recebido no Mês"
          value={formatCurrency(summary?.paidThisMonth)}
          icon={DollarSign}
          iconColor="text-success"
          change={summary?.paidGrowthPercent}
          changeLabel="vs mês anterior"
        />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Parcelas Vencidas"
          value={summary?.overdueInstallments?.toLocaleString('pt-BR') ?? '—'}
          icon={AlertTriangle}
          iconColor="text-danger"
        />
        <StatCard
          title="Contemplações Ativas"
          value={summary?.activeContemplations?.toLocaleString('pt-BR') ?? '—'}
          icon={CheckCircle}
          iconColor="text-success"
        />
        <StatCard
          title="Cotas Ativas"
          value={summary?.activeQuotas?.toLocaleString('pt-BR') ?? '—'}
          icon={TrendingUp}
          iconColor="text-orange-500"
        />
        <StatCard
          title="Próxima Assembleia"
          value={summary?.nextAssemblyDate ? formatDate(summary.nextAssemblyDate, 'dd/MM/yyyy') : 'Não agendada'}
          icon={Calendar}
          iconColor="text-blue-500"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evolução mensal */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Evolução Mensal — Arrecadação vs Inadimplência
          </h3>
          {summary?.monthlyEvolution?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={summary.monthlyEvolution} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOverdue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'paid' ? 'Arrecadado' : 'Inadimplente',
                  ]}
                />
                <Area type="monotone" dataKey="paid" stroke="#2563EB" fill="url(#gradPaid)" strokeWidth={2} />
                <Area type="monotone" dataKey="overdue" stroke="#DC2626" fill="url(#gradOverdue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sem dados suficientes
            </div>
          )}
        </div>

        {/* Distribuição por categoria */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Distribuição por Categoria
          </h3>
          {summary?.categoryDistribution?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={summary.categoryDistribution}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="45%"
                  outerRadius={70}
                  innerRadius={40}
                >
                  {summary.categoryDistribution.map((_: unknown, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) => <span style={{ color: '#6B7280' }}>{value}</span>}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sem dados
            </div>
          )}
        </div>
      </div>

      {/* Inadimplência por grupo */}
      {summary?.delinquencyByGroup?.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Inadimplência por Grupo
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={summary.delinquencyByGroup} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="groupCode" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Inadimplência']} />
              <Bar dataKey="rate" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Avisos regulatórios */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <strong>Ambiente de homologação:</strong> Este sistema opera em modo demonstrativo.
          Nenhuma operação financeira real é executada. Sujeito à aprovação regulatória
          junto ao Banco Central do Brasil (Lei 11.795/2008) antes da operação em produção.
        </p>
      </div>
    </div>
  )
}

// Type definitions for the dashboard response
interface MonthlyPoint { month: string; paid: number; overdue: number }
interface CategoryPoint { category: string; value: number }
interface DelinquencyPoint { groupCode: string; rate: number }

interface AdminDashboard {
  totalCustomers: number
  customersGrowthPercent?: number
  activeGroups: number
  totalCreditVolume: number
  paidThisMonth: number
  paidGrowthPercent?: number
  overdueInstallments: number
  activeContemplations: number
  activeQuotas: number
  nextAssemblyDate?: string
  monthlyEvolution: MonthlyPoint[]
  categoryDistribution: CategoryPoint[]
  delinquencyByGroup: DelinquencyPoint[]
}
