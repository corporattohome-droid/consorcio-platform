import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import compression from '@fastify/compress'
import helmet from '@fastify/helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'
import { TransformInterceptor } from './shared/interceptors/transform.interceptor'
import { AuditInterceptor } from './shared/interceptors/audit.interceptor'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV === 'development' }),
  )

  const config = app.get(ConfigService)

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'", "https: 'unsafe-inline'"],
      },
    },
  })

  await app.register(compression)

  app.enableCors({
    origin: [
      config.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      config.get('NEXT_PUBLIC_CLIENT_APP_URL', 'http://localhost:3002'),
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new AuditInterceptor(),
  )

  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Consórcio Platform API')
      .setDescription('API REST para administração de consórcios — documentação completa')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('auth', 'Autenticação e autorização')
      .addTag('dashboard', 'Indicadores e métricas')
      .addTag('customers', 'Gestão de clientes')
      .addTag('groups', 'Grupos de consórcio')
      .addTag('quotas', 'Cotas')
      .addTag('contracts', 'Contratos')
      .addTag('installments', 'Parcelas')
      .addTag('payments', 'Pagamentos')
      .addTag('assemblies', 'Assembleias e sorteios')
      .addTag('contemplations', 'Contemplações e crédito')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    })

    logger.log('Swagger disponível em /api/docs')
  }

  const port = config.get<number>('API_PORT', 3001)
  await app.listen(port, '0.0.0.0')
  logger.log(`API rodando em http://0.0.0.0:${port}/api/v1`)
}

bootstrap()
