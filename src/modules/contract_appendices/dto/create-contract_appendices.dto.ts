import {Transform} from 'class-transformer';
import {IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength} from 'class-validator';

export class CreateContractAppendiesDto {
  @IsNotEmpty({message: 'contractId không được để trống'})
  @MaxLength(10, {message: 'contractId không được vượt quá 10 ký tự'})
  @IsNumber({}, {message: 'contractId phải là số'})
  @Transform(({value}) => value && value.trim())
  contractId: number;

  @IsNotEmpty({message: 'change_type không được để trống'})
  @IsString({message: 'change_type phải là chuỗi'})
  @MaxLength(20, {message: 'change_type không được vượt quá 20 ký tự'})
  change_type: string;

  @IsNotEmpty({message: 'url_sub_contract không được để trống'})
  @IsString({message: 'url_sub_contract phải là chuỗi'})
  @Transform(({value}) => value && value.trim())
  url_sub_contract: string;

  @IsOptional()
  note?: string;
}
