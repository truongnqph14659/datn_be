import {Type} from 'class-transformer';
import {IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength} from 'class-validator';

export class CreateCheckInOutDto {
  @IsNotEmpty({message: 'employee_id không được để trống'})
  @IsNumber({}, {message: 'employee_id phải là số'})
  @Type(() => Number)
  employee_id: number;

  @IsNotEmpty({message: 'datetime không được để trống'})
  datetime: Date;

  @IsNotEmpty({message: 'type không được để trống'})
  @IsString({message: 'type phải là chuỗi'})
  @MaxLength(15, {message: 'type không được quá 15 ký tự'})
  @IsIn(['check-in', 'check-out'], {
    message: 'type chỉ được là "check-in" hoặc "check-out"',
  })
  type: string;

  @IsOptional()
  @IsString({message: 'url_image phải là chuỗi'})
  @MaxLength(255, {message: 'url_image không được quá 255 ký tự'})
  url_image?: string;
}
