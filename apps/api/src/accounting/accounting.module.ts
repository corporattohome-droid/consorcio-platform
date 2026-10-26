import { Module } from '@nestjs/common'
import { AccountingService } from './accounting.service'
import { AccountingController } from './accounting.controller'
import { PrismaModule } from '../shared/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
