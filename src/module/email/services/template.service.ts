import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<
    string,
    Handlebars.TemplateDelegate
  >();
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
  }

  // Compile Handlebars template with context
  compile(templateName: string, context: Record<string, any>): string {
    const template = this.getCompiledTemplate(templateName);
    const enrichedContext = {
      year: new Date().getFullYear(),
      ...context,
    };
    return template(enrichedContext);
  }

  private getCompiledTemplate(
    templateName: string,
  ): Handlebars.TemplateDelegate {
    const cleanName = templateName.replace(/\.hbs$/, '');

    if (this.templateCache.has(cleanName)) {
      return this.templateCache.get(cleanName)!;
    }

    const templatePath = path.join(this.templatesDir, `${cleanName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Email template file not found at: ${templatePath}`);
      throw new NotFoundException(`Email template "${cleanName}" not found`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(templateContent);
    this.templateCache.set(cleanName, compiled);

    return compiled;
  }
}
