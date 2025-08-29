import {RoleEntity} from 'src/modules/roles/entities/role.entity';

///
export class AuthPayload {
  id: number;
  email: string;
  roles: RoleEntity;
}
