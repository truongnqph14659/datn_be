export enum COMMON_CODE_TYPE {
  CODE = '0001',
}

export const JWT_SECRET_KEY = process.env.SECRET_KEY;
export const HEADER_TOKEN_KEY = process.env.HEADER_TOKEN_KEY;

export enum ROLES_ACTIONS {
  //role
  ROLES_READ = 'role.read',
  ROLES_READ_DETAIL = 'role.read_detail',
  ROLES_CREATE = 'role.create',
  ROLES_UPDATE = 'role.update',
  ROLES_DELETE = 'role.delete',
  //role-permission
  ROLES_PERMISSION_READ = 'role-permission.read',
  ROLES_PERMISSION_READ_DETAIL = 'role-permission.read_detail',
  ROLES_PERMISSION_CREATE = 'role-permission.create',
  ROLES_PERMISSION_UPDATE = 'role-permission.update',
  ROLES_PERMISSION_DELETE = 'role-permission.delete',
}

export  enum TYPE_UPDATE_WORK {
  EXCEL_UP = 'upload_excel',
  PERSONAL_UP='personal_update'

}