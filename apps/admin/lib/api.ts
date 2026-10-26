import axios from 'axios'
import { getSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(
      err.response?.data?.message ?? err.message ?? 'Erro desconhecido',
    )
  },
)

// ─── Endpoints tipados ──────────────────────────────────────
export const dashboardApi = {
  getAdminSummary: () => api.get('/dashboard/admin'),
  getClientDashboard: () => api.get('/dashboard/client'),
}

export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: unknown) => api.post('/customers', data),
  update: (id: string, data: unknown) => api.put(`/customers/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/customers/${id}/status`, { status }),
}

export const groupsApi = {
  list: (params?: Record<string, unknown>) => api.get('/groups', { params }),
  get: (id: string) => api.get(`/groups/${id}`),
  create: (data: unknown) => api.post('/groups', data),
  openEnrollment: (id: string) => api.patch(`/groups/${id}/open-enrollment`),
  activate: (id: string) => api.patch(`/groups/${id}/activate`),
}

export const quotasApi = {
  list: (params?: Record<string, unknown>) => api.get('/quotas', { params }),
  get: (id: string) => api.get(`/quotas/${id}`),
  assign: (id: string, customerId: string) => api.post(`/quotas/${id}/assign`, { customerId }),
  transfer: (id: string, data: unknown) => api.post(`/quotas/${id}/transfer`, data),
}

export const contractsApi = {
  create: (data: unknown) => api.post('/contracts', data),
  get: (id: string) => api.get(`/contracts/${id}`),
  byCustomer: (customerId: string) => api.get(`/contracts/customer/${customerId}`),
  sign: (id: string) => api.post(`/contracts/${id}/sign`),
}

export const installmentsApi = {
  byQuota: (quotaId: string) => api.get(`/installments/quota/${quotaId}`),
  generate: (data: unknown) => api.post('/installments/generate', data),
  overdue: () => api.get('/installments/overdue'),
}

export const paymentsApi = {
  registerTest: (data: unknown) => api.post('/payments/test', data),
  byQuota: (quotaId: string) => api.get(`/payments/quota/${quotaId}`),
}

export const assembliesApi = {
  list: (params?: Record<string, unknown>) => api.get('/assemblies', { params }),
  get: (id: string) => api.get(`/assemblies/${id}`),
  schedule: (data: unknown) => api.post('/assemblies', data),
  registerBid: (id: string, data: unknown) => api.post(`/assemblies/${id}/bids`, data),
  executeDraw: (id: string) => api.post(`/assemblies/${id}/draw`),
}
