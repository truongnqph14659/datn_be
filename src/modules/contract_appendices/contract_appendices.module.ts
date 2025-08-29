import {Module} from '@nestjs/common';
import {ContractAppendicesService} from './contract_appendices.service';
import {ContractAppendicesController} from './contract_appendices.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ContractAppencicesEntity} from './entities/contract_appendices.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContractAppencicesEntity])],
  controllers: [ContractAppendicesController],
  providers: [ContractAppendicesService],
})
export class ContractAppendicesModule {}
