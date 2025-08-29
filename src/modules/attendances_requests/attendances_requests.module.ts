import {Module} from '@nestjs/common';
import {AttendancesRequestsService} from './attendances_requests.service';
import {AttendancesRequestsController} from './attendances_requests.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {AttendancesRequestEntity} from 'src/modules/attendances_requests/entities/attendances_request.entity';
import {EmployeeModule} from 'src/modules/employee/employee.module';
import {CheckInOutModule} from 'src/modules/check-in-out/check-in-out.module';

@Module({
  imports: [TypeOrmModule.forFeature([AttendancesRequestEntity]), EmployeeModule, CheckInOutModule],
  controllers: [AttendancesRequestsController],
  providers: [AttendancesRequestsService],
  exports: [AttendancesRequestsService],
})
export class AttendancesRequestsModule {}
