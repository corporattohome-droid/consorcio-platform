import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    if (!WRITE_METHODS.includes(request.method)) return next.handle()
    const startedAt = Date.now()
    return next.handle().pipe(
      tap({ next: () => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[AUDIT] ${request.method} ${request.url} — ${Date.now() - startedAt}ms`)
        }
      }}),
    )
  }
}
