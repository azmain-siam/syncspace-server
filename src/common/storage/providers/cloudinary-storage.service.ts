/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { StorageProviderType } from '../enums/storage-provider.enum';
import {
  StorageProvider,
  UploadResult,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class CloudinaryStorageService implements StorageProvider {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary SDK initialized successfully.');
    } else {
      this.logger.warn(
        'Cloudinary environment variables missing. Cloudinary storage calls will fail until credentials are set.',
      );
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'syncspace/workspace/task-attachments',
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: 'auto' as const,
      };

      if (file.buffer) {
        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result?: UploadApiResponse) => {
            if (error || !result) {
              this.logger.error('Cloudinary upload stream failed:', error);
              return reject(
                new InternalServerErrorException(
                  `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
                ),
              );
            }

            resolve({
              url: result.secure_url,
              storageKey: result.public_id,
              provider: StorageProviderType.CLOUDINARY,
            });
          },
        );

        Readable.from(file.buffer).pipe(stream);
      } else if (file.path) {
        cloudinary.uploader.upload(
          file.path,
          uploadOptions,
          (error, result?: UploadApiResponse) => {
            if (error || !result) {
              this.logger.error('Cloudinary file path upload failed:', error);
              return reject(
                new InternalServerErrorException(
                  `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
                ),
              );
            }

            resolve({
              url: result.secure_url,
              storageKey: result.public_id,
              provider: StorageProviderType.CLOUDINARY,
            });
          },
        );
      } else {
        reject(
          new BadRequestException(
            'Invalid file payload: Missing buffer or path',
          ),
        );
      }
    });
  }

  async delete(storageKey: string): Promise<void> {
    if (!storageKey) return;

    try {
      // Try raw image/raw/video resource deletion
      await cloudinary.uploader.destroy(storageKey, {
        invalidate: true,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to delete asset ${storageKey} from Cloudinary:`,
        error,
      );
      throw new InternalServerErrorException(
        `Cloudinary delete failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
