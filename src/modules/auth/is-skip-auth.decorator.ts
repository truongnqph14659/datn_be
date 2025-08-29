import {SetMetadata} from '@nestjs/common';

export const IS_SKIP_AUTH_KEY = 'isSkipAuth';
/**
 * @param isSkipAuth default is true
 */
const IsSkipAuth = (isSkipAuth = true) => SetMetadata(IS_SKIP_AUTH_KEY, isSkipAuth);

export {IsSkipAuth};
