import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message?: string;
  data: T;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((response) => {
        if (response && typeof response === 'object') {
          if ('meta' in response && 'data' in response) {
            return {
              statusCode: context.switchToHttp().getResponse().statusCode,
              message: response?.message || 'Success',
              data: response?.data || null,
              meta: response?.meta || null,
            };
          }
        }
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: response?.message || 'Success',
          data: response?.data || null,
        };
      }),
    );
  }
}
