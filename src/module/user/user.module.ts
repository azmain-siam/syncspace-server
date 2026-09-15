import { Module } from '@nestjs/common';
import { StorageModule } from 'src/common/storage/storage.module';
import { AuditLogModule } from '../audit/audit-log.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, StorageModule, AuditLogModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
