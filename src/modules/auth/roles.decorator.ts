import {SetMetadata} from '@nestjs/common';

export const ROLES_KEY = 'roles_key';
/**
 * Roles decorator to set roles for a route
 * @param roles roles to set
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'is_public';
/**
 * @param isPublic default is true
 */
export const IsPublic = (isPublic = true) => SetMetadata(IS_PUBLIC_KEY, isPublic);
