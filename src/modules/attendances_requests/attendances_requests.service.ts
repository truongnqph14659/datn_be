import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {AttendancesRequestEntity} from 'src/modules/attendances_requests/entities/attendances_request.entity';
import {CheckInOutService} from 'src/modules/check-in-out/check-in-out.service';
import {EmployeeService} from 'src/modules/employee/employee.service';
import {Repository} from 'typeorm';

@Injectable()
export class AttendancesRequestsService {
  constructor(
    @InjectRepository(AttendancesRequestEntity)
    private attendanceReqRepo: Repository<AttendancesRequestEntity>,
    private employeeService: EmployeeService,
    private checkInOutService: CheckInOutService,
  ) {}

  async findOne(id: number) {
    const foundAttendanceRequest = await this.attendanceReqRepo.find({
      where: {attendanceId: id},
    });

    if (!foundAttendanceRequest.length) {
        return {
        message:'không có request nào trong ngày này',
        data:[]
      }
    }
    const entityManager = this.attendanceReqRepo.manager;
    const ids = foundAttendanceRequest.map((item) => item.requestEmpId);
    const sqlRaw = `
      SELECT
        request_employee._id,
        request_employee.employee_id,
        request_employee.request_id,
        request_employee.fields,
        request_employee.desc,
        request_employee.finalStatusAproval,
        rs._id AS rs_id,
        rs.name,
        rs.code,
        at._id AS at_id,
        at.workDate
      FROM request_employee
      LEFT JOIN requests rs ON rs._id = request_employee.request_id
      LEFT JOIN attendances at ON at._id = ${id}
      WHERE request_employee.isDeleted = 0 AND request_employee._id IN (${ids})
    `;

    const result = await entityManager.query(sqlRaw);
    const processedRequests = result.map((req) => {
      let fields;
      try {
        fields = JSON.parse(req.fields);
      } catch (e) {
        fields = {};
      }
      return {
        _id: req._id,
        employee_id: req.employee_id,
        request_id: req.request_id,
        request_name: req.name || 'UNKNOWN',
        request_code: req.code || 'UNKNOWN',
        final_status_aproval: req.finalStatusAproval,
        work_date: req.workDate,
        fields,
      };
    });

    if(processedRequests.length == 0) return {
      message:'không có request nào',
      data:[]
    }

    const employee = await this.employeeService.findEmployeeWithSchedule(processedRequests[0].employee_id);

    if (!employee) {
      throw new NotFoundException(`Không tìm thấy thông tin nhân viên ${processedRequests[0].employee_id}`);
    }

    const checkInOutData = await this.checkInOutService.getCheckInOutSummaryForDay(
      processedRequests[0].employee_id,
      processedRequests[0].work_date,
    );

    return {
      message: 'Lấy thông tin chi tiết yêu cầu chấm công thành công',
      data: {
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
        },
        requests: processedRequests,
        work_schedule: employee.workScheduled || null,
        check_inout_detail: {
          earliest_checkin: checkInOutData.earliestCheckin,
          latest_checkout: checkInOutData.latestCheckout,
        },
      },
    };
  }

  async createFromRequestEmp({attendanceId, requestEmpId}: {attendanceId: number; requestEmpId: number}) {
    const foundAttendance = await this.attendanceReqRepo.findOne({
      where: {attendanceId, requestEmpId},
    });
    if (foundAttendance) {
      return;
      // throw new NotFoundException(
      //   `Yêu cầu chấm công đã tồn tại với ID ${attendanceId} và requestEmpId ${requestEmpId}`,
      // );
    }
    const attendanceRequest = this.attendanceReqRepo.create({
      requestEmpId,
      attendanceId,
    });
    await this.attendanceReqRepo.save(attendanceRequest);
    return {
      message: 'Tạo yêu cầu chấm công thành công',
      data: attendanceRequest,
    };
  }

  // REPOSITORIES
  async checkAttendanceRequestExist({
    attendanceId,
    requestEmpId,
  }: {
    attendanceId: number;
    requestEmpId: number;
  }): Promise<boolean> {
    return await this.attendanceReqRepo.exist({
      where: {attendanceId, requestEmpId},
    });
  }
}
