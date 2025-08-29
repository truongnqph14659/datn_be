import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {IS_PUBLIC_KEY, ROLES_KEY} from 'src/modules/auth/roles.decorator';
import {AuthPayload} from 'src/modules/auth/type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (!requiredRoles) return true;

    const {user} = context.switchToHttp().getRequest();
    // const permission = (user as AuthPayload).roles?.role_permissions;
    // if (!permission.length) {
    //   return false;
    // }
    // const code = permission.map((item) => item.code);
    // return requiredRoles.some((role) => code?.includes(role));
  }
}
