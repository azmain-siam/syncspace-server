import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './services/email.service';
import { TemplateService } from './services/template.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        TemplateService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const mockConfig: Record<string, string | number | boolean> = {
                'email.host': 'smtp.gmail.com',
                'email.port': 587,
                'email.secure': false,
                'email.user': 'test@gmail.com',
                'email.pass': 'secret',
                'email.from': 'SyncSpace <noreply@syncspace.com>',
              };
              return mockConfig[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
