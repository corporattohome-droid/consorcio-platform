import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { AccountingService, CreateJournalEntryDto } from './accounting.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  @Get('journal')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getJournalEntries(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getJournalEntries({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }

  @Get('journal/:id')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  getJournalEntry(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getJournalEntry(id)
  }

  @Post('journal')
  @Roles('ADMIN', 'MANAGER', 'CASHIER')
  @ApiOperation({ summary: 'Create a draft journal entry (double-entry validated)' })
  createJournalEntry(@Body() dto: CreateJournalEntryDto) {
    return this.svc.createJournalEntry(dto)
  }

  @Patch('journal/:id/post')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Post a draft journal entry and update ledger balances' })
  postJournalEntry(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.postJournalEntry(id)
  }

  @Get('accounts')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR', 'CASHIER')
  @ApiOperation({ summary: 'List all ledger accounts (chart of accounts)' })
  getLedgerAccounts() {
    return this.svc.getLedgerAccounts()
  }

  @Get('accounts/:id')
  @Roles('ADMIN', 'MANAGER', 'AUDITOR')
  @ApiOperation({ summary: 'Get ledger account with recent transactions' })
  getLedgerAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getLedgerAccount(id)
  }

  @Get('trial-balance')
  @Roles('ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get trial balance (validates double-entry integrity)' })
  getTrialBalance() {
    return this.svc.getTrialBalance()
  }
}
