export interface IRolePermissions {
  _id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  code: string | null;
  name: string;
  parent_id: null;
  type: string;
  route: string | null;
}

export interface IUser {
  id: number;
  email: string;
  iat: number;
  exp: number;
  roles: {
    _id: number;
    name: string;
    desc: string;
    isDeleted: number;
    createdBy: number;
    updatedBy: number;
    role_permissions: IRolePermissions[] | null;
  };
}
