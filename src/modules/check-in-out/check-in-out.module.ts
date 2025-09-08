import {forwardRef, Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {CheckInOutEntity} from 'src/modules/check-in-out/entities/check-in-out.entity';
import {CheckInOutController} from './check-in-out.controller';
import {CheckInOutService} from './check-in-out.service';
import {EmployeeModule} from 'src/modules/employee/employee.module';
import {AttendancesModule} from 'src/modules/attendances/attendances.module';
@Module({
  imports: [TypeOrmModule.forFeature([CheckInOutEntity]), EmployeeModule],
  controllers: [CheckInOutController],
  providers: [CheckInOutService],
  exports: [CheckInOutService],
})
export class CheckInOutModule {}
