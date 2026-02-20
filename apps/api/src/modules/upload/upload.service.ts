import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = join(process.cwd(), 'uploads');
    this.baseUrl = process.env.API_URL || 'http://localhost:4000';
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    const dirs = ['images', 'documents'].map((sub) => join(this.uploadDir, sub));
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  validateImage(file: Express.Multer.File): void {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'INVALID_IMAGE_TYPE',
        message: `Type de fichier non autorise. Types acceptes: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException({
        code: 'IMAGE_TOO_LARGE',
        message: `L'image ne doit pas depasser ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      });
    }
  }

  validateDocument(file: Express.Multer.File): void {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'INVALID_DOCUMENT_TYPE',
        message: `Type de fichier non autorise. Types acceptes: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`,
      });
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      throw new BadRequestException({
        code: 'DOCUMENT_TOO_LARGE',
        message: `Le document ne doit pas depasser ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB`,
      });
    }
  }

  processUploadedFile(
    file: Express.Multer.File,
    category: 'images' | 'documents',
  ): UploadedFile {
    // diskStorage sets file.filename; keep it to avoid returning a URL to a non-existent file
    const ext = extname(file.originalname).toLowerCase();
    const filename = file.filename || `${uuidv4()}${ext}`;
    const relativePath = `uploads/${category}/${filename}`;

    return {
      url: `${this.baseUrl}/${relativePath}`,
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  deleteFile(filename: string, category: 'images' | 'documents'): boolean {
    const filePath = join(this.uploadDir, category, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getUploadPath(category: 'images' | 'documents'): string {
    return join(this.uploadDir, category);
  }
}
