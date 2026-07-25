import { Injectable } from '@nestjs/common';
import {
  StorageProvider,
  UploadResult,
} from '../interfaces/storage-provider.interface';
import { CloudinaryStorageService } from './cloudinary-storage.service';

@Injectable()
export class StorageService implements StorageProvider {
  constructor(private readonly activeProvider: CloudinaryStorageService) {}

  async upload(
    file: Express.Multer.File,
    folder: string = 'syncspace/workspace/task-attachments',
  ): Promise<UploadResult> {
    return this.activeProvider.upload(file, folder);
  }

  async delete(storageKey: string): Promise<void> {
    return this.activeProvider.delete(storageKey);
  }
}
