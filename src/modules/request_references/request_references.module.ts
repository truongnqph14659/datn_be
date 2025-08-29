import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RequestReferencesEntity} from 'src/modules/request_references/entities/request_reference.entity';
import {RequestReferencesController} from './request_references.controller';
import {RequestReferencesService} from './request_references.service';

@Module({
  imports: [TypeOrmModule.forFeature([RequestReferencesEntity])],
  controllers: [RequestReferencesController],
  providers: [RequestReferencesService],
  exports: [RequestReferencesService],
})
export class RequestReferencesModule {}
