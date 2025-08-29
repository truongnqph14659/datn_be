import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AuthController} from './auth.controller';
import {EmployeeModule} from 'src/modules/employee/employee.module';
import {JwtModule} from 'src/modules/base-modules/jwt/jwt.module';

@Module({
  imports: [EmployeeModule, JwtModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
