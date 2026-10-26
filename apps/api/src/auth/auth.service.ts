import {
  Injectable, UnauthorizedException, ForbiddenException,
  BadRequestException, Logger
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../shared/prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { UserRole } from '@prisma/client'

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  customerId?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const MAX_FAILED_LOGINS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) {
      await bcrypt.compare(password, '$2b$12$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
      throw new UnauthorizedException('Credenciais inválidas')
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw new ForbiddenException(`Conta bloqueada. Tente novamente em ${minutesLeft} minutos.`)
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Conta inativa ou suspensa. Entre em contato com o suporte.')
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      const newCount = user.failedLoginCount + 1
      const update: any = { failedLoginCount: newCount }

      if (newCount >= MAX_FAILED_LOGINS) {
        update.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
        this.logger.warn(`Conta ${email} bloqueada após ${newCount} tentativas`)
      }

      await this.prisma.user.update({ where: { id: user.id }, data: update })
      throw new UnauthorizedException('Credenciais inválidas')
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    })

    return user
  }

  async login(loginDto: LoginDto, ipAddress?: string): Promise<TokenPair> {
    const user = await this.validateUser(loginDto.email, loginDto.password)
    return this.generateTokenPair(user, ipAddress)
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Token inválido')
    }

    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    })

    const validSession = await Promise.any(
      sessions.map(async (s) => {
        if (!s.refreshHash) throw new Error('no hash')
        const match = await bcrypt.compare(refreshToken, s.refreshHash)
        if (!match) throw new Error('no match')
        return s
      }),
    ).catch(() => null)

    if (!validSession) {
      throw new UnauthorizedException('Refresh token inválido ou expirado')
    }

    await this.prisma.userSession.update({
      where: { id: validSession.id },
      data: { revokedAt: new Date() },
    })

    return this.generateTokenPair(user)
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  private async generateTokenPair(user: any, ipAddress?: string): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId ?? undefined,
    }

    const expiresIn = 15 * 60

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn,
    })

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    )

    const refreshHash = await bcrypt.hash(refreshToken, 10)

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: accessToken.slice(-32),
        refreshHash,
        ipAddress: ipAddress ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return { accessToken, refreshToken, expiresIn }
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, status: true,
        mfaEnabled: true, lastLoginAt: true, customerId: true,
        customer: {
          select: { fullName: true, personType: true, kycStatus: true },
        },
      },
    })
  }
}
