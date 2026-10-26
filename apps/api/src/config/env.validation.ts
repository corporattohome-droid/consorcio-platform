import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
})

export type EnvConfig = z.infer<typeof envSchema>

export function validate(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config)
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => `  ${e.path.join('.')}: ${e.message}`)
    throw new Error(`Variáveis de ambiente inválidas:\n${errors.join('\n')}`)
  }
  return parsed.data
}
