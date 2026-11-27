import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const jwtSecret = process.env.MINDPLACE_JWT_SECRET || 'mindplace-phase32-local-development-secret';

if (!process.env.MINDPLACE_JWT_SECRET) {
  console.warn('MINDPLACE_JWT_SECRET no está definido; se usará una clave local de desarrollo.');
}

@Module({
  imports: [JwtModule.register({ secret: jwtSecret, signOptions: { expiresIn: '30d' } })],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
