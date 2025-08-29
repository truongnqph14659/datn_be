import {Transform} from 'class-transformer';
import {IsNumber} from 'class-validator';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';

export class QueryAttendanceDto extends QuerySpecificationDto {
  @IsNumber({}, {message: 'employeeId phải là số'})
  @Transform(({value}) => value && Number(value))
  employeeId: number;
}
