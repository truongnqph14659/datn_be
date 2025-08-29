const a = require;
import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsString} from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: 'Email of user',
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Password of user',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
