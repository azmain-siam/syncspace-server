import { Global, Module } from '@nestjs/common';
import { EntityValidationService } from './services/entity-validation.service';

@Global()
@Module({
  providers: [EntityValidationService],
  exports: [EntityValidationService],
})
export class CommonModule {}
