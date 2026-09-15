import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { TemplateService } from './services/template.service';

@Module({
  providers: [EmailService, TemplateService],
  exports: [EmailService],
})
export class EmailModule {}
