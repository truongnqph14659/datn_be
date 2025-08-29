import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import {Response} from 'express';
import {ErrCustom} from 'src/utils/error.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const {httpAdapter} = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) return; // Không gửi lại nếu đã gửi rồi

    // log request body
    const request = ctx.getRequest();
    //////// if is instance of HttpException, response out that exception
    if (exception instanceof HttpException) {
      httpAdapter.reply(ctx.getResponse(), exception.getResponse(), exception.getStatus());
      console.error(exception);
      return;
    }
    //////// else, response out new HttpException with status 500
    else {
      let message = 'Internal server error';
      if (exception?.['message']) {
        message = exception['message'];
      } else {
        try {
          message = JSON.stringify(exception);
        } catch (error) {}
      }
      console.error(exception);
      const newException = new ErrCustom(message, 'UnhandledException', HttpStatus.INTERNAL_SERVER_ERROR);
      httpAdapter.reply(ctx.getResponse(), newException.getResponse(), newException.getStatus());
      return;
    }
  }
}
