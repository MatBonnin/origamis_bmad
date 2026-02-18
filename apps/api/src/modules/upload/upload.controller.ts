import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../../common/guards';
import { UploadService, UploadedFile as UploadResult } from './upload.service';

type ApiEnvelope<T> = { data: T; error: null };

const createStorage = (category: 'images' | 'documents') =>
  diskStorage({
    destination: join(process.cwd(), 'uploads', category),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload une image (avatar, banniere)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: createStorage('images') }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiEnvelope<UploadResult>> {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    this.uploadService.validateImage(file);
    const result = this.uploadService.processUploadedFile(file, 'images');

    return { data: result, error: null };
  }

  @Post('document')
  @ApiOperation({ summary: 'Upload un document (diplome, certificat)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: createStorage('documents') }))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiEnvelope<UploadResult>> {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    this.uploadService.validateDocument(file);
    const result = this.uploadService.processUploadedFile(file, 'documents');

    return { data: result, error: null };
  }
}
