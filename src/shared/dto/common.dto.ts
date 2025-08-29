import {Transform} from 'class-transformer';
import {IsInt, IsNotEmpty, Min} from 'class-validator';

export class ParamIdDto {
  @IsNotEmpty()
  @Transform(({value}) => value && +value)
  @IsInt()
  @Min(1)
  id: number;
}
