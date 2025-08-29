import {forwardRef, Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ApproverListModule} from 'src/modules/approver_list/approver_list.module';
import {AttendancesModule} from 'src/modules/attendances/attendances.module';
import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';
import {AttendancesRequestsModule} from 'src/modules/attendances_requests/attendances_requests.module';
import {CheckInOutModule} from 'src/modules/check-in-out/check-in-out.module';
import {EmployeeModule} from 'src/modules/employee/employee.module';
import {RequestEmployeeEntity} from 'src/modules/request-employee/entities/request-employee.entity';
import {RequestReferencesModule} from 'src/modules/request_references/request_references.module';
import {RequestsModule} from 'src/modules/requests/requests.module';
import {RequestEmployeeController} from './request-employee.controller';
import {RequestEmployeeService} from './request-employee.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestEmployeeEntity, AttendanceEntity]),
    AttendancesModule,
    AttendancesRequestsModule,
    forwardRef(() => ApproverListModule),
    RequestReferencesModule,
    RequestsModule,
    EmployeeModule,
    CheckInOutModule,
  ],
  controllers: [RequestEmployeeController],
  providers: [RequestEmployeeService],
  exports: [RequestEmployeeService],
})
export class RequestEmployeeModule {}
