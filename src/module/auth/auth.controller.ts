import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { User } from 'src/common/interfaces/user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenGuard } from './guards/refresh-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('User registered successfully')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ResponseMessage('User logged in successfully')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ResponseMessage('Tokens refreshed successfully')
  refresh(@CurrentUser() user: User) {
    return this.authService.refresh(user.id);
  }

  // @Post('logout')
  // logout(@Body('userId') userId: string) {
  //   return this.authService.logout(userId);
  // }
}
