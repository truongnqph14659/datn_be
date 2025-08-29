import {Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {ApiBody, ApiSecurity, ApiTags} from '@nestjs/swagger';
import {SignInDto} from 'src/modules/auth/dto/auth.dto';
import {IsSkipAuth} from 'src/modules/auth/is-skip-auth.decorator';
import {AuthPayload} from 'src/modules/auth/type';
import {AuthGuard} from './auth.guard';
import {AuthService} from './auth.service';

@ApiTags('auth')
@UseGuards(AuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private jwtService: JwtService) {}

  @IsSkipAuth()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    type: SignInDto,
  })
  async signIn(@Body() signInDto: SignInDto) {
    const response = await this.authService.signIn(signInDto.email, signInDto.password);
    return response;
  }

  @Get('profile')
  @ApiSecurity('authorization')
  getProfile(@Request() req) {
    const user: AuthPayload = req['user'];
    return this.authService.getProfile(user.id);
  }
}
