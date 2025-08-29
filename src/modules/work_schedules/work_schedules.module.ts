import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {WorkScheduleEntity} from 'src/modules/work_schedules/entities/work_schedule.entity';
import {WorkSchedulesController} from './work_schedules.controller';
import {WorkSchedulesService} from './work_schedules.service';
import { EmployeeEntity } from '../employee/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkScheduleEntity,EmployeeEntity])],
  controllers: [WorkSchedulesController],
  providers: [WorkSchedulesService],
})
export class WorkSchedulesModule {}
