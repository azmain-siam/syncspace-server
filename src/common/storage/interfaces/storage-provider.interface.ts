import { StorageProviderType } from '../enums/storage-provider.enum';

export interface UploadResult {
  url: string;
  storageKey: string;
  provider: StorageProviderType;
}

export interface StorageProvider {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;

  delete(storageKey: string): Promise<void>;
}
