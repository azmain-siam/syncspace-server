import { Global, Module } from '@nestjs/common';
import { CloudinaryStorageService } from './providers/cloudinary-storage.service';
import { StorageService } from './providers/storage.service';

@Global()
@Module({
  providers: [CloudinaryStorageService, StorageService],
  exports: [StorageService, CloudinaryStorageService],
})
export class StorageModule {}
