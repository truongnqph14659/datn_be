import {HttpException, HttpStatus} from '@nestjs/common';

/**
 * this is common error
 * in most case, you will use specific err like others below
 * */
class ErrCustom extends HttpException {
  constructor(message: string, code: string, status = 500) {
    super(
      {
        status,
        error: code,
        message: [message],
      },
      status,
    );
  }
}

/**
 * default code is 'EntityNotFound'
 */
class ErrEntityNotFound extends HttpException {
  constructor(message?: string, code?: string) {
    if (!message) message = 'Entity not found';
    if (!code) code = 'EntityNotFound';
    const status = HttpStatus.BAD_REQUEST;
    super(
      {
        status,
        error: code,
        message: [message],
      },
      status,
    );
  }
}

class ErrInvalid extends HttpException {
  constructor(message?: string, code?: string) {
    if (!message) message = 'Invalid';
    if (!code) code = 'Invalid';
    const status = HttpStatus.BAD_REQUEST;
    super(
      {
        status,
        error: code,
        message: [message],
      },
      status,
    );
  }
}

export {ErrEntityNotFound, ErrInvalid, ErrCustom};
