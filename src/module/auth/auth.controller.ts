import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/get-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { User } from 'src/common/interfaces/user.interface';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ResponseMessage('Registration successful. Please verify your email.')
  @ApiOperation({ summary: 'Register user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  @ResponseMessage('Email verified successfully')
  @ApiOperation({ summary: 'Verify email address with token' })
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Verification email resent successfully')
  @ApiOperation({ summary: 'Resend email verification token' })
  resendVerification(@CurrentUser() user: User) {
    return this.authService.resendVerificationEmail(user.id);
  }

  @Post('login')
  @ResponseMessage('User logged in successfully')
  @ApiOperation({ summary: 'Login user' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  googleAuth() {
    // Passport redirects to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback endpoint' })
  async googleAuthCallback(
    @CurrentUser() profile: GoogleProfile,
    @Res() res: Response,
  ) {
    const result = await this.authService.validateGoogleUser(profile);

    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const redirectUrl = `${baseUrl}/auth/google/callback?accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`;

    return res.redirect(redirectUrl);
  }

  @Post('forgot-password')
  @ResponseMessage('If an account exists, a password reset link has been sent.')
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  @ApiOperation({ summary: 'Reset password using token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ResponseMessage('Tokens refreshed successfully')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@CurrentUser() user: User) {
    return this.authService.refresh(user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User logged out successfully')
  @ApiOperation({ summary: 'Logout user' })
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }
}
