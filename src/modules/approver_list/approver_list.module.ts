import {forwardRef, Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ApproverListEntity} from 'src/modules/approver_list/entities/approver_list.entity';
import {RequestEmployeeModule} from 'src/modules/request-employee/request-employee.module';
import {ApproverListController} from './approver_list.controller';
import {ApproverListService} from './approver_list.service';
import {AttendancesRequestEntity} from 'src/modules/attendances_requests/entities/attendances_request.entity';
import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApproverListEntity, AttendancesRequestEntity, AttendanceEntity]),
    forwardRef(() => RequestEmployeeModule),
  ],
  controllers: [ApproverListController],
  providers: [ApproverListService],
  exports: [ApproverListService],
})
export class ApproverListModule {}
