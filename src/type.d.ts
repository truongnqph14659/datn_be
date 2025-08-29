import 'express';
import {IUser} from 'src/shared/types/user.type';

declare module 'express' {
  interface Request {
    user?: IUser;
  }
}
