import { IsString, IsEnum, IsInt, IsNumber, IsOptional, IsDateString, Min, Max, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { GroupCategory } from '@prisma/client'

export class CreateGroupDto {
  @ApiProperty() @IsString() @MinLength(3) name: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiProperty({ enum: GroupCategory }) @IsEnum(GroupCategory) category: GroupCategory
  @ApiProperty() @IsInt() @Min(10) @Max(1000) totalQuotas: number
  @ApiProperty() @IsNumber() @Min(1000) creditValue: number
  @ApiProperty() @IsInt() @Min(12) @Max(240) termMonths: number
  @ApiProperty({ description: 'Taxa de administração (%)' }) @IsNumber() @Min(0) @Max(30) adminFeePercent: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reserveFundPercent?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) insurancePercent?: number
  @ApiPropertyOptional() @IsOptional() @IsDateString() enrollmentStartDate?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() enrollmentEndDate?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedStartDate?: string
  @ApiPropertyOptional() @IsOptional() @IsString() internalNotes?: string
}
