import { Request } from 'express';
import * as fs from 'fs';
import multer, { diskStorage, StorageEngine } from 'multer';
import { extname } from 'path';

export const storageConfig = (
  folder: string = './public/uploads',
): StorageEngine => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return diskStorage({
    destination: folder,
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  });
};

export const memoryStorageConfig = multer.memoryStorage();

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

export const attachmentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types: images, PDFs, office documents, text files, and zip archives.`,
      ),
      false,
    );
  }
};
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const avatarFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error(
        `Unsupported avatar format: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF.`,
      ),
      false,
    );
  }
};
