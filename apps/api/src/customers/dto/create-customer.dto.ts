import { IsEnum, IsString, IsEmail, IsOptional, IsDateString, ValidateNested, MinLength, MaxLength, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PersonType } from '@prisma/client'

class AddressDto {
  @IsString() zipCode: string
  @IsString() street: string
  @IsString() number: string
  @IsOptional() @IsString() complement?: string
  @IsString() neighborhood: string
  @IsString() city: string
  @IsString() @MinLength(2) @MaxLength(2) state: string
}

export class CreateCustomerDto {
  @ApiProperty({ enum: PersonType }) @IsEnum(PersonType) personType: PersonType
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) fullName: string
  @ApiPropertyOptional() @IsOptional() @IsString() tradeName?: string
  @ApiProperty() @IsString() @Matches(/^\d{11}$|^\d{14}$/, { message: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos' }) taxId: string
  @ApiProperty() @IsEmail() email: string
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() phone2?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string
  @ApiPropertyOptional() @IsOptional() @IsString() maritalStatus?: string
  @ApiPropertyOptional() @IsOptional() @IsString() occupation?: string
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto
}
