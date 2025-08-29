import {Type} from 'class-transformer';
import {IsNotEmpty, IsNumber} from 'class-validator';

export class CreateApproverListDto {
  @IsNotEmpty({message: 'request_employee_id không được để trống'})
  @IsNumber({}, {message: 'request_employee_id phải là số'})
  @Type(() => Number)
  request_employee_id: number;

  @IsNotEmpty({message: 'employee_id không được để trống'})
  @IsNumber({}, {message: 'employee_id phải là số'})
  @Type(() => Number)
  employee_id: number;

  @IsNotEmpty({message: 'stepOrderAprrover không được để trống'})
  @IsNumber({}, {message: 'stepOrderAprrover phải là số'})
  @Type(() => Number)
  stepOrderAprrover: number;
}

export class ApproveRequestDto {
  @IsNotEmpty({message: 'approverId không được để trống'})
  @IsNumber({}, {message: 'approverId phải là số'})
  @Type(() => Number)
  approverId: number;

  @IsNotEmpty({message: 'employeeId không được để trống'})
  @IsNumber({}, {message: 'employeeId phải là số'})
  @Type(() => Number)
  employeeId: number;

  @IsNotEmpty({message: 'requestEmployeeId không được để trống'})
  @IsNumber({}, {message: 'requestEmployeeId phải là số'})
  @Type(() => Number)
  requestEmployeeId: number;
}
