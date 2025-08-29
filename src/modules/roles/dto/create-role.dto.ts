import {Type} from 'class-transformer';
import {IsArray, IsNotEmpty, IsOptional, IsString} from 'class-validator';

export class CreateRoleDto {
  @Type(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;

  @Type(() => String)
  @IsString()
  @IsOptional()
  desc?: string;

  @IsNotEmpty()
  @IsArray()
  role_permissions_id: number[];
}

export class dataReqRolePermission {
  @Type(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;

  @Type(() => String)
  @IsString()
  @IsOptional()
  desc?: string;

  @IsNotEmpty()
  @IsArray()
  role_permissions_id: number[];
}
