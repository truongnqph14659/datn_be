import {Transform} from 'class-transformer';
import {IsNotEmpty, IsNumber} from 'class-validator';

export class GetPendingApprovalsDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({value}) => Number(value))
  employeeId: number;
}
