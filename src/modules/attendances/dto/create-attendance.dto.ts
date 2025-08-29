import {IsNotEmpty, IsNumber, IsOptional} from 'class-validator';

export class CreateAttendanceDto {
  @IsNotEmpty({message: 'roleId không được để trống'})
  @IsNumber({}, {message: 'roleId phải là số'})
  employeeId: number;

  @IsNotEmpty({message: 'workDate không được để trống'})
  workDate: Date;

  @IsOptional()
  @IsNumber({}, {message: 'total_hours phải là số'})
  total_hours?: number | null;

  @IsOptional()
  @IsNumber({}, {message: 'overtime phải là số'})
  overtime?: number;

  @IsOptional()
  @IsNumber({}, {message: 'isPenalty phải là số'})
  isPenalty?: number;
}
