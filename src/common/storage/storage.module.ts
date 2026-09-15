import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import { CloudinaryStorageService } from './providers/cloudinary-storage.service';
import { StorageService } from './providers/storage.service';

@Global()
@Module({
  providers: [
    CloudinaryStorageService,
    {
      provide: STORAGE_PROVIDER,
      useClass: CloudinaryStorageService,
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_PROVIDER, CloudinaryStorageService],
})
export class StorageModule {}
