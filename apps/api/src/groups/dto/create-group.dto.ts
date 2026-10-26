import { IsString, IsInt, IsNumber, IsOptional, Min, Max, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateGroupDto {
  @ApiProperty() @IsString() @MinLength(3) name: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiProperty() @IsString() planId: string
  @ApiProperty() @IsInt() @Min(10) @Max(1000) totalQuotas: number
  @ApiProperty() @IsNumber() @Min(1000) creditAmount: number
  @ApiProperty() @IsInt() @Min(12) @Max(240) termMonths: number
  @ApiProperty({ description: 'Taxa de administração (%)' }) @IsNumber() @Min(0) @Max(30) adminFeeRate: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reserveFundRate?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) insuranceRate?: number
}
