import { PartialType, OmitType } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { CreateCustomerDto } from './create-customer.dto'

export class UpdateCustomerDto extends PartialType(OmitType(CreateCustomerDto, ['taxId', 'personType'] as const)) {
  @IsOptional() @IsString() internalNotes?: string
}
