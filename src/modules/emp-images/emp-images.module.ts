import {Module} from '@nestjs/common';
import {EmpImagesService} from './emp-images.service';
import {EmpImagesController} from './emp-images.controller';

@Module({
  controllers: [EmpImagesController],
  providers: [EmpImagesService],
})
export class EmpImagesModule {}
