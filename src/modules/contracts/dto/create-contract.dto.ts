import {Transform} from 'class-transformer';
import {IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength} from 'class-validator';

export class CreateContractDto {
  @IsNotEmpty({message: 'employeeId không được để trống'})
  @MaxLength(10, {message: 'employeeId không được vượt quá 10 ký tự'})
  @IsNumber({}, {message: 'employeeId phải là số'})
  @Transform(({value}) => value && value.trim())
  employeeId: number;

  @IsNotEmpty({message: 'contract_type không được để trống'})
  @IsString({message: 'contract_type phải là chuỗi'})
  @MaxLength(100, {message: 'contract_type không được vượt quá 100 ký tự'})
  contract_type: string;

  @IsNotEmpty({message: 'status không được để trống'})
  @IsString({message: 'status phải là chuỗi'})
  @MaxLength(50, {message: 'status không được vượt quá 50 ký tự'})
  @Transform(({value}) => value && value.trim())
  status: string;

  @IsNotEmpty({message: 'status không được để trống'})
  @IsString({message: 'status phải là chuỗi'})
  @Transform(({value}) => value && value.trim())
  url_contract: string;

  @IsOptional()
  note?: string;

  @IsNotEmpty({message: 'start_working không được để trống'})
  start_date: Date;

  @IsOptional()
  end_date?: Date;
}
