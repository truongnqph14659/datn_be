import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RequestEntity} from 'src/modules/requests/entities/request.entity';
import {RequestsController} from './requests.controller';
import {RequestsService} from './requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([RequestEntity])],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
