import {Controller, Post, Req, UseInterceptors} from '@nestjs/common';
import {AnyFilesInterceptor} from '@nestjs/platform-express';
import {UploadService} from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('')
  @UseInterceptors(AnyFilesInterceptor())
  uploadContractFile(@Req() req: Request) {
    return this.uploadService.uploadFile(req);
  }
}
