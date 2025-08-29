import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {CommonCodeEntity} from 'src/modules/common-code/entities/common-code.entity';
import {CommonCodeController} from './common-code.controller';
import {CommonCodeService} from './common-code.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommonCodeEntity])],
  controllers: [CommonCodeController],
  providers: [CommonCodeService],
  exports: [CommonCodeService],
})
export class CommonCodeModule {}
