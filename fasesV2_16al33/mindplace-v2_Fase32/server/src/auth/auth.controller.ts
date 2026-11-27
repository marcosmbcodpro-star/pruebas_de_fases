import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body.email, body.password, body.name ?? '');
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  me(@Headers('authorization') header?: string) {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Falta el token.');
    return { user: this.auth.publicUser(this.auth.verifyToken(token)) };
  }
}
