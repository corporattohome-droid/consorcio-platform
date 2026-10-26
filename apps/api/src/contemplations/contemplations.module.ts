import { Module } from '@nestjs/common'
import { ContemplationsService } from './contemplations.service'
import { ContemplationsController } from './contemplations.controller'
import { PrismaModule } from '../shared/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ContemplationsController],
  providers: [ContemplationsService],
  exports: [ContemplationsService],
})
export class ContemplationsModule {}
