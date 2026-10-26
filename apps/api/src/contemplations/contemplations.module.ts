import { Module } from '@nestjs/common'
import { ContemplationsController } from './contemplations.controller'
import { ContemplationsService } from './contemplations.service'
import { PrismaModule } from '../shared/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ContemplationsController],
  providers: [ContemplationsService],
})
export class ContemplationsModule {}
