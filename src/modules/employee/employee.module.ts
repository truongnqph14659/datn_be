import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ContractAppencicesEntity} from 'src/modules/contract_appendices/entities/contract_appendices.entity';
import {ContractEntity} from 'src/modules/contracts/entities/contract.entity';
import {EmpImageEntity} from 'src/modules/emp-images/entities/emp-image.entity';
import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {WorkScheduleEntity} from 'src/modules/work_schedules/entities/work_schedule.entity';
import {EmployeeController} from './employee.controller';
import {EmployeeService} from './employee.service';
import {CommonCodeEntity} from '../common-code/entities/common-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
      WorkScheduleEntity,
      ContractEntity,
      ContractAppencicesEntity,
      EmpImageEntity,
      CommonCodeEntity,
    ]),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
