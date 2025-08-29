import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';
import {AttendancesRequestsModule} from 'src/modules/attendances_requests/attendances_requests.module';
import {CheckInOutModule} from 'src/modules/check-in-out/check-in-out.module';
import {EmployeeModule} from 'src/modules/employee/employee.module';
import {AttendancesController} from './attendances.controller';
import {AttendancesService} from './attendances.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceEntity]), EmployeeModule, CheckInOutModule, AttendancesRequestsModule],
  controllers: [AttendancesController],
  providers: [AttendancesService],
  exports: [AttendancesService],
})
export class AttendancesModule {}
