# Consórcio Platform

Sistema enterprise de administração de consórcios brasileiro.

## Stack
- **Backend**: NestJS + Fastify + Prisma + PostgreSQL
- **Admin**: Next.js 14 App Router (porta 3001)
- **Portal Cliente**: Next.js 14 App Router (porta 3002)
- **Monorepo**: Turborepo + pnpm workspaces

## Setup
```bash
pnpm install
docker-compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

> ⚠️ Sistema em homologação. Não declarar pronto para produção sem validação regulatória completa.
