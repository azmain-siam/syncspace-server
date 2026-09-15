import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
  UploadResult,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class StorageService implements StorageProvider {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly activeProvider: StorageProvider,
  ) {}

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
