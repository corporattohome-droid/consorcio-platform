import { Module } from '@nestjs/common'
import { ContemplationsService } from './contemplations.service'

@Module({
  providers: [ContemplationsService],
  exports: [ContemplationsService],
})
export class ContemplationsModule {}
