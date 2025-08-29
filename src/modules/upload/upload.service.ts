import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {handleAndUploadFile} from 'src/utils/upload-files.util';

@Injectable()
export class UploadService {
  async uploadFile(req: Request) {
    try {
      const {data, message} = await handleAndUploadFile(req);
      // handle createContractDto
      return {
        message: message,
        data: data,
      };
    } catch (error) {
      throw new HttpException('upload error.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
