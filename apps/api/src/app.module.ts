import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bull'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-yet'
import { AuthModule } from './auth/auth.module'
import { CustomersModule } from './customers/customers.module'
import { GroupsModule } from './groups/groups.module'
import { QuotasModule } from './quotas/quotas.module'
import { ContractsModule } from './contracts/contracts.module'
import { InstallmentsModule } from './installments/installments.module'
import { PaymentsModule } from './payments/payments.module'
import { AssembliesModule } from './assemblies/assemblies.module'
import { ContemplationsModule } from './contemplations/contemplations.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { PrismaModule } from './shared/prisma/prisma.module'
import { validate } from './config/env.validation'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: { host: 'localhost', port: 6379 },
          password: config.get('REDIS_PASSWORD') || undefined,
          ttl: 60 * 1000,
        }),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: 'localhost',
          port: 6379,
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    DashboardModule,
    CustomersModule,
    GroupsModule,
    QuotasModule,
    ContractsModule,
    InstallmentsModule,
    PaymentsModule,
    AssembliesModule,
    ContemplationsModule,
  ],
})
export class AppModule {}
