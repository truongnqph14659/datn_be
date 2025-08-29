import {PartialType} from '@nestjs/swagger';
import {IsNotEmpty, IsNumber, IsOptional} from 'class-validator';
import {CreateEmployeeDto} from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsNumber({}, {message: '_id phải là số'})
  @IsOptional()
  _id?: number;
}
