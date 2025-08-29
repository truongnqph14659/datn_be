import {Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {instanceToPlain} from 'class-transformer';
import {EmployeeService} from 'src/modules/employee/employee.service';
import {verifyPassword} from 'src/utils/helper';

@Injectable()
export class AuthService {
  constructor(private employeeService: EmployeeService, private jwtService: JwtService) {}

  async signIn(username: string, pass: string) {
    const user = await this.employeeService.findEmployeeByEmail(username);
    console.log('user', user);

    if (!user) {
      throw new NotFoundException(`Nguời dùng không tồn tại`);
    }

    const isVerifyPass = await verifyPassword(pass, user.password);

    if (!isVerifyPass) {
      throw new UnauthorizedException();
    }
    const {password, ...result} = user;
    // TODO: Generate a JWT and return it here
    // instead of the user object
    const payload = {id: user._id, email: user.email, roles: user.roles};
    return {
      message: 'Login successful',
      data: {
        user: instanceToPlain(result),
        access_token: await this.jwtService.signAsync(payload),
      },
    };
  }

  async getProfile(id: number) {
    const data = await this.employeeService.findEmployeeByIdWithRoles(id);
    return {data};
  }
}
