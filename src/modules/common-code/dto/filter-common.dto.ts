import {ApiProperty} from '@nestjs/swagger';
import {IsEnum} from 'class-validator';

export enum CommonTypeCode {
  TYPE_CONTRACT = 'TYPE_CONTRACT',
  WORK_STATUS = 'WORK_STATUS',
  SUB_CONTRACT = 'SUB_CONTRACT',
}

export type TypeCode = `${CommonTypeCode}`;

export class FilterCommonCode {
  @ApiProperty({
    enum: CommonTypeCode,
    description: 'Loại mã cần filter',
    example: CommonTypeCode.TYPE_CONTRACT,
  })
  @IsEnum(CommonTypeCode, {message: 'type_code không hợp lệ'})
  type_code: TypeCode;
}
