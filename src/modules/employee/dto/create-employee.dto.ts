import {Transform, Type} from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ContractAppendixDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  _id: number;

  @IsString()
  @IsNotEmpty({message: 'change_type không được để trống'})
  change_type: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  url_sub_contract?: string;
}

// Hợp đồng
class ContractDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  _id: number;

  @IsString()
  @IsNotEmpty({message: 'contract_type không được để trống'})
  contract_type: string;

  @IsNotEmpty({message: 'start_date không được để trống'})
  @Type(() => Date)
  start_date: Date;

  @IsOptional()
  @Type(() => Date)
  end_date?: Date;

  @IsOptional()
  @IsString() // sửa lại từ number thành string để khớp với entity
  status?: string;

  @IsOptional()
  @IsString()
  url_contract?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => ContractAppendixDto)
  appendices?: ContractAppendixDto[];
}

// Ca làm việc
class WorkScheduleDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  _id: number;

  @IsNumber()
  @Min(1, {message: 'expected_hours phải lớn hơn 0'})
  @Type(() => Number)
  expected_hours: number;

  @IsNumber()
  @Min(0, {message: 'break_time không được âm'})
  @Type(() => Number)
  break_time: number;

  @IsNotEmpty({message: 'shift_start không được để trống'})
  shiftStart: string;

  @IsNotEmpty({message: 'shift_end không được để trống'})
  shiftEnd: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number;
}

// Nhân viên
export class CreateEmployeeDto {
  @IsNotEmpty({message: 'name không được để trống'})
  @IsString()
  // @MaxLength(100, {message: 'name không được vượt quá 100 ký tự'})
  @Transform(({value}) => value && value.trim())
  name: string;

  @IsNotEmpty({message: 'email không được để trống'})
  @IsString()
  @IsEmail({}, {message: 'email không đúng định dạng'})
  @MaxLength(100)
  @Transform(({value}) => value && value.trim())
  email: string;

  @IsNotEmpty({message: 'roleId không được để trống'})
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deprId?: number;

  @IsNotEmpty({message: 'time_working không được để trống'})
  @Type(() => Array)
  time_working: [];

  @IsNotEmpty({message: 'break_time không được để trống'})
  @Type(() => Number)
  break_time?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({value}) => value && value.trim())
  status?: Number;

  @IsOptional()
  @IsNumber()
  isActive?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id_no?: number;

  @IsOptional()
  @IsString()
  @Transform(({value}) => value && value.trim())
  tax_no?: string;

  @IsOptional()
  @IsString()
  @Transform(({value}) => value && value.trim())
  address?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  position_name?: string;

  @IsOptional()
  password?: any;

  @IsOptional()
  contract_type?: any;

  @IsOptional()
  contract_note?: any;

  @IsOptional()
  contract_range_picker?: any;

  @IsOptional()
  sub_contract_sub_type?: any;

  @IsOptional()
  sub_contract_note?: any;

  @ValidateNested()
  @Type(() => WorkScheduleDto)
  @IsOptional()
  workSchedule?: WorkScheduleDto;
}
