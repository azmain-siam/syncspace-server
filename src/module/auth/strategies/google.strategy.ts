import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export class GoogleProfile {
  googleId!: string;
  email!: string;
  name!: string;
  avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('google.clientId') || 'dummy-client-id',
      clientSecret:
        configService.get<string>('google.clientSecret') ||
        'dummy-client-secret',
      callbackURL:
        configService.get<string>('google.callbackUrl') ||
        'http://localhost:5000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, displayName, emails, photos } = profile;

    const normalizedProfile: GoogleProfile = {
      googleId: id,
      email: emails && emails.length > 0 ? emails[0].value : '',
      name: displayName || 'Google User',
      avatar: photos && photos.length > 0 ? photos[0].value : undefined,
    };

    done(null, normalizedProfile);
  }
}
