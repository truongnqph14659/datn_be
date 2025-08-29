import {Module} from '@nestjs/common';
import {ContractsService} from './contracts.service';
import {ContractsController} from './contracts.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ContractEntity} from './entities/contract.entity';
import {EmployeeEntity} from '../employee/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContractEntity, EmployeeEntity])],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
