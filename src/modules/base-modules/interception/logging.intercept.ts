import {CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable, tap} from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // log begin request

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        // log end request
        this.logger.log(`\tCompleted\t${Date.now() - now} ms`);
      }),
    );
  }
}
